import argparse
import json
import sys
from typing import Any
from collections import defaultdict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

# Tweak path to allow running directly from backend/scripts
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.app.core.database import SessionLocal
from backend.app.models.san_pham_chuan_hoa import SanPhamChuanHoa
from backend.app.models.san_pham_tho import SanPhamTho
from backend.app.models.lich_su_gia import LichSuGia
from backend.app.services.text_matching_service import TextMatchingService
from backend.app.services.search_cache_service import bump_search_cache_version

class RepairLegacyDataTool:
    def __init__(self, db: Session):
        self.db = db
        self.matcher = TextMatchingService()
        self.report = {
            "groups_scanned": 0,
            "raw_items_scanned": 0,
            "groups_reclassified": 0,
            "raw_items_moved": 0,
            "raw_items_detached": 0,
            "groups_merged": 0,
            "groups_deleted": 0,
            "review_required": 0,
            "history_before": self._count_history(),
            "history_after": 0,
            "errors": [],
            "actions": []
        }

    def _count_history(self) -> int:
        return self.db.query(LichSuGia).count()

    def audit(self, target_group_ids: list[int] = None):
        query = self.db.query(SanPhamChuanHoa).options(joinedload(SanPhamChuanHoa.san_pham_tho))
        if target_group_ids is not None:
            query = query.filter(SanPhamChuanHoa.maSPCH.in_(target_group_ids))
        groups = query.all()
        
        for group in groups:
            self.report["groups_scanned"] += 1
            raw_items = group.san_pham_tho
            self.report["raw_items_scanned"] += len(raw_items)
            
            raw_classifications = []
            for raw in raw_items:
                norm_name = self.matcher._normalize_text(raw.tenSanPham)
                is_acc = self.matcher._is_accessory(norm_name)
                product_type = self.matcher._classify_product_type(norm_name, is_acc)
                raw_classifications.append({
                    "raw": raw,
                    "norm_name": norm_name,
                    "is_acc": is_acc,
                    "product_type": product_type
                })
            
            # Phân tích Group
            group_type = group.productType
            has_phone = any(r["product_type"] == "phone" for r in raw_classifications)
            has_acc = any(r["product_type"] == "accessory" for r in raw_classifications)
            has_other = any(r["product_type"] not in ["phone", "accessory"] for r in raw_classifications)

            if len(raw_items) == 0:
                self._record_action(group, None, "DELETE_EMPTY_GROUP", None, "Group rỗng")
                continue
                
            if has_other:
                self._record_action(group, None, "REVIEW_REQUIRED", None, "Có item ambiguous")
                continue

            if group_type == "phone":
                if has_acc and not has_phone:
                    # Pure mislabel
                    self._record_action(group, None, "RECLASSIFY_GROUP", "accessory", "Pure accessory bị gắn nhãn phone")
                elif has_acc and has_phone:
                    # Mixed group
                    for r in raw_classifications:
                        if r["product_type"] == "accessory":
                            self._record_action(group, r["raw"], "DETACH_FOR_REGROUP", "accessory", "Tách phụ kiện khỏi mixed phone group")
                    # Recompute group
                    self._record_action(group, None, "RECOMPUTE_GROUP", "phone", "Recompute thông tin đại diện phone")
                elif not has_acc and has_phone:
                    # Check wrong representative
                    norm_group = self.matcher._normalize_text(group.tenChuanHoa)
                    if self.matcher._is_accessory(norm_group):
                        self._record_action(group, None, "RECOMPUTE_GROUP", "phone", "Tên đại diện mượn từ phụ kiện")
            
            elif group_type == "accessory":
                if has_phone and not has_acc:
                    self._record_action(group, None, "RECLASSIFY_GROUP", "phone", "Pure phone bị gắn nhãn accessory")
                elif has_phone and has_acc:
                    for r in raw_classifications:
                        if r["product_type"] == "phone":
                            self._record_action(group, r["raw"], "DETACH_FOR_REGROUP", "phone", "Tách phone khỏi mixed accessory group")
                    self._record_action(group, None, "RECOMPUTE_GROUP", "accessory", "Recompute thông tin đại diện accessory")

    def _record_action(self, group, raw, action, target_type, reason):
        if action == "REVIEW_REQUIRED":
            self.report["review_required"] += 1
            
        action_dict = {
            "action": action,
            "reason": reason,
            "group_maSPCH": group.maSPCH,
            "group_ten": group.tenChuanHoa,
            "group_type": group.productType,
            "target_type": target_type
        }
        if raw:
            action_dict["raw_maSPTho"] = raw.maSPTho
            action_dict["raw_ten"] = raw.tenSanPham
            
        self.report["actions"].append(action_dict)

    def apply(self):
        try:
            with self.db.begin_nested():
                # Xử lý theo thứ tự: DETACH -> RECLASSIFY -> RECOMPUTE -> DELETE EMPTY
                for action in self.report["actions"]:
                    act = action["action"]
                    if act == "DETACH_FOR_REGROUP":
                        self._apply_detach_for_regroup(action)
                    elif act == "RECLASSIFY_GROUP":
                        self._apply_reclassify(action)
                    elif act == "RECOMPUTE_GROUP":
                        self._apply_recompute(action)
                    elif act == "DELETE_EMPTY_GROUP":
                        self._apply_delete(action)
            self.db.commit()
            
            # Invalidate caches for affected groups
            affected_keywords = set()
            for action in self.report["actions"]:
                group = self.db.query(SanPhamChuanHoa).get(action["group_maSPCH"])
                if group and group.tenChuanHoa:
                    affected_keywords.add(group.tenChuanHoa)
            for kw in affected_keywords:
                bump_search_cache_version(kw)
                
        except Exception as e:
            self.db.rollback()
            self.report["errors"].append(str(e))
            raise e
        finally:
            self.report["history_after"] = self._count_history()

    def _apply_detach_for_regroup(self, action):
        raw = self.db.query(SanPhamTho).get(action["raw_maSPTho"])
        if raw:
            group = raw.san_pham_chuan_hoa
            if group and raw in group.san_pham_tho:
                group.san_pham_tho.remove(raw)
            raw.maSPCH = None
            self.report["raw_items_detached"] += 1

    def _apply_reclassify(self, action):
        group = self.db.query(SanPhamChuanHoa).get(action["group_maSPCH"])
        if not group: return
        
        target_type = action["target_type"]
        
        # Check conflict
        conflict = self.db.query(SanPhamChuanHoa).filter(
            SanPhamChuanHoa.productType == target_type,
            SanPhamChuanHoa.modelKey == group.modelKey,
            SanPhamChuanHoa.dungLuong == group.dungLuong,
            SanPhamChuanHoa.tinhTrang == group.tinhTrang,
            SanPhamChuanHoa.maSPCH != group.maSPCH
        ).first()
        
        if conflict:
            # Merge: move all raw items to conflict group
            for raw in list(group.san_pham_tho):
                raw.maSPCH = conflict.maSPCH
                self.report["raw_items_moved"] += 1
            # Use Core delete to prevent ORM cascade from resetting maSPCH to NULL
            self.db.execute(SanPhamChuanHoa.__table__.delete().where(SanPhamChuanHoa.maSPCH == group.maSPCH))
            self.report["groups_merged"] += 1
        else:
            group.productType = target_type
            self.report["groups_reclassified"] += 1
            # Recompute to fix modelKey if needed
            self._apply_recompute(action)

    def _apply_recompute(self, action):
        group = self.db.query(SanPhamChuanHoa).get(action["group_maSPCH"])
        if not group or not group.san_pham_tho:
            return
            
        # Find best representative from valid raw items
        valid_raws = []
        for raw in group.san_pham_tho:
            norm_name = self.matcher._normalize_text(raw.tenSanPham)
            is_acc = self.matcher._is_accessory(norm_name)
            p_type = self.matcher._classify_product_type(norm_name, is_acc)
            if p_type == group.productType:
                valid_raws.append(raw)
                
        if not valid_raws:
            return
            
        best_raw = min(valid_raws, key=lambda x: x.giaHienTai if x.giaHienTai > 0 else float('inf'))
        
        norm_best = self.matcher._normalize_text(best_raw.tenSanPham)
        new_storage = self.matcher._extract_storage(norm_best)
        new_brand = self.matcher._extract_brand(norm_best)
        tokens = self.matcher._tokenize(norm_best)
        new_model = self.matcher._extract_model_key(norm_best, tokens, new_brand, new_storage)
        
        # Check unique constraint before updating
        if new_model != group.modelKey or new_storage != group.dungLuong:
            conflict = self.db.query(SanPhamChuanHoa).filter(
                SanPhamChuanHoa.productType == group.productType,
                SanPhamChuanHoa.modelKey == new_model,
                SanPhamChuanHoa.dungLuong == new_storage,
                SanPhamChuanHoa.tinhTrang == group.tinhTrang,
                SanPhamChuanHoa.maSPCH != group.maSPCH
            ).first()
            if conflict:
                # Need to merge instead
                for r in list(group.san_pham_tho):
                    r.maSPCH = conflict.maSPCH
                    self.report["raw_items_moved"] += 1
                self.db.execute(SanPhamChuanHoa.__table__.delete().where(SanPhamChuanHoa.maSPCH == group.maSPCH))
                self.report["groups_merged"] += 1
                return
                
        group.tenChuanHoa = best_raw.tenSanPham
        group.anhDaiDien = best_raw.hinhAnh
        group.modelKey = new_model
        group.dungLuong = new_storage
        
    def _apply_delete(self, action):
        group = self.db.query(SanPhamChuanHoa).get(action["group_maSPCH"])
        if group and not group.san_pham_tho:
            self.db.delete(group)
            self.report["groups_deleted"] += 1

def main():
    parser = argparse.ArgumentParser(description="Audit and Repair Legacy Database Data")
    parser.add_argument("--dry-run", action="store_true", help="Only audit, do not modify DB")
    parser.add_argument("--apply", action="store_true", help="Apply repairs to DB")
    parser.add_argument("--output", type=str, help="Output report to file")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        tool = RepairLegacyDataTool(db)
        tool.audit()
        
        if args.apply:
            tool.apply()
            
        report_json = json.dumps(tool.report, indent=2, ensure_ascii=False)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(report_json)
            print(f"Report written to {args.output}")
        else:
            print(report_json)
            
    finally:
        db.close()

if __name__ == "__main__":
    main()
