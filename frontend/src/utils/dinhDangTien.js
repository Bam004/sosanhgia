export function dinhDangTien(value) {
  if (value === null || value === undefined || value === '' || Number(value) === 0) {
    return 'Đang cập nhật';
  }

  return Number(value).toLocaleString('vi-VN') + 'đ';
}
