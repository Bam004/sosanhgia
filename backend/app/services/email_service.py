import logging
import smtplib
from email.message import EmailMessage
from typing import Optional, Union

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


def _tao_ket_qua_gui_email(
    thanh_cong: bool,
    loi: Optional[str],
    tra_ve_chi_tiet: bool,
) -> Union[bool, dict]:
    if tra_ve_chi_tiet:
        return {
            "success": thanh_cong,
            "error": loi,
        }

    return thanh_cong


def send_price_alert_email(
    to_email: str,
    user_name: Optional[str],
    product_name: str,
    target_price: float,
    current_price: float,
    source_name: str,
    product_link: str,
    original_link: str,
    return_details: bool = False,
) -> Union[bool, dict]:
    if (
        not settings.SMTP_HOST
        or not settings.SMTP_USERNAME
        or not settings.SMTP_PASSWORD
    ):
        error_message = (
            "SMTP config is missing. Cannot send price alert email."
        )
        logger.error(error_message)

        return _tao_ket_qua_gui_email(
            False,
            error_message,
            return_details,
        )

    msg = EmailMessage()

    greeting = (
        f"Chào {user_name},"
        if user_name
        else "Chào bạn,"
    )

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #0284c7;">
                    Sản phẩm đã đạt mức giá bạn mong muốn!
                </h2>

                <p>{greeting}</p>

                <p>
                    Sản phẩm <strong>{product_name}</strong>
                    mà bạn đang theo dõi hiện đã giảm xuống
                    mức giá mục tiêu.
                </p>

                <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;">
                        💰 Giá mục tiêu của bạn:
                        <strong>{target_price:,.0f} đ</strong>
                    </p>

                    <p style="margin: 5px 0; color: #16a34a; font-size: 1.1em;">
                        🔥 Giá hiện tại:
                        <strong>{current_price:,.0f} đ</strong>
                    </p>

                    <p style="margin: 5px 0;">
                        🏪 Nơi bán rẻ nhất:
                        <strong>{source_name}</strong>
                    </p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <a
                        href="{product_link}"
                        style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;"
                    >
                        Xem trên So Sánh Giá
                    </a>

                    <a
                        href="{original_link}"
                        style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;"
                    >
                        Đến nơi bán ngay
                    </a>
                </div>

                <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                    Bạn nhận được email này vì bạn đã thiết lập
                    theo dõi giá trên hệ thống của chúng tôi.
                    Nếu bạn muốn hủy theo dõi, vui lòng truy cập
                    trang Quản lý theo dõi giá.
                </p>
            </div>
        </body>
    </html>
    """

    text_content = (
        f"Sản phẩm {product_name} đã đạt giá mục tiêu "
        f"{target_price:,.0f} đ. "
        f"Giá hiện tại: {current_price:,.0f} đ "
        f"tại {source_name}."
    )

    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype="html")

    msg["Subject"] = "Sản phẩm đã đạt mức giá bạn mong muốn"
    msg["From"] = (
        settings.SMTP_FROM_EMAIL
        or settings.SMTP_USERNAME
    )
    msg["To"] = to_email

    server = None

    try:
        if settings.SMTP_USE_TLS:
            server = smtplib.SMTP(
                settings.SMTP_HOST,
                settings.SMTP_PORT,
                timeout=30,
            )
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(
                settings.SMTP_HOST,
                settings.SMTP_PORT,
                timeout=30,
            )

        server.login(
            settings.SMTP_USERNAME,
            settings.SMTP_PASSWORD,
        )
        server.send_message(msg)

        logger.info(
            "Price alert email sent successfully to %s",
            to_email,
        )

        return _tao_ket_qua_gui_email(
            True,
            None,
            return_details,
        )

    except Exception as exc:
        error_message = str(exc)

        logger.exception(
            "Failed to send email to %s: %s",
            to_email,
            error_message,
        )

        return _tao_ket_qua_gui_email(
            False,
            error_message,
            return_details,
        )

    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                logger.warning(
                    "Could not close SMTP connection cleanly.",
                    exc_info=True,
                )

