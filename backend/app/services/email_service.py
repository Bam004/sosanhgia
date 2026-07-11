import smtplib
from email.message import EmailMessage
import logging
from typing import Optional

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

def send_price_alert_email(
    to_email: str,
    user_name: Optional[str],
    product_name: str,
    target_price: float,
    current_price: float,
    source_name: str,
    product_link: str,
    original_link: str
) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.error("SMTP config is missing. Cannot send price alert email.")
        return False

    msg = EmailMessage()
    
    greeting = f"Chào {user_name}," if user_name else "Chào bạn,"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #0284c7;">Sản phẩm đã đạt mức giá bạn mong muốn!</h2>
                <p>{greeting}</p>
                <p>Sản phẩm <strong>{product_name}</strong> mà bạn đang theo dõi hiện đã giảm xuống mức giá mục tiêu.</p>
                
                <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;">💰 Giá mục tiêu của bạn: <strong>{target_price:,.0f} đ</strong></p>
                    <p style="margin: 5px 0; color: #16a34a; font-size: 1.1em;">🔥 Giá hiện tại: <strong>{current_price:,.0f} đ</strong></p>
                    <p style="margin: 5px 0;">🏪 Nơi bán rẻ nhất: <strong>{source_name}</strong></p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="{product_link}" style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Xem trên So Sánh Giá</a>
                    <a href="{original_link}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Đến nơi bán ngay</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                    Bạn nhận được email này vì bạn đã thiết lập theo dõi giá trên hệ thống của chúng tôi. Nếu bạn muốn hủy theo dõi, vui lòng truy cập trang Quản lý theo dõi giá.
                </p>
            </div>
        </body>
    </html>
    """
    
    msg.set_content(f"Sản phẩm {product_name} đã đạt giá mục tiêu {target_price:,.0f} đ. Giá hiện tại: {current_price:,.0f} đ tại {source_name}.")
    msg.add_alternative(html_content, subtype='html')
    
    msg['Subject'] = "Sản phẩm đã đạt mức giá bạn mong muốn"
    msg['From'] = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    msg['To'] = to_email

    try:
        if settings.SMTP_USE_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
            
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Price alert email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False
