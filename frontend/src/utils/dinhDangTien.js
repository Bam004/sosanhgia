export function dinhDangTien(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  return Number(value).toLocaleString('vi-VN') + 'đ';
}
