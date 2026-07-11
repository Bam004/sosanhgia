from backend.app.models.san_pham_tho import SanPhamTho

def test_transaction_rollback_proof(db_session):
    proof_link = "https://proof.local/t1d-rollback-20260711"
    
    # Tao SanPhamTho toi thieu hop le
    sp = SanPhamTho(
        tenSanPham="T1D Rollback Proof Product",
        sanTMDT="Test Proof",
        giaHienTai=1000000,
        linkGoc=proof_link,
        sellerName="Proof Seller",
        sellerRating=4.8
    )
    
    db_session.add(sp)
    db_session.commit()
    
    # Query lai de xac nhan da luu trong current session
    saved_sp = db_session.query(SanPhamTho).filter(SanPhamTho.linkGoc == proof_link).first()
    
    assert saved_sp is not None
    assert saved_sp.tenSanPham == "T1D Rollback Proof Product"
    assert saved_sp.sanTMDT == "Test Proof"
    assert saved_sp.sellerName == "Proof Seller"
    assert saved_sp.sellerRating == 4.8
