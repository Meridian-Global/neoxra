SUPPORTED_LOCALES = ("en", "zh-TW")
DEFAULT_LOCALE = "en"


def validate_locale(value: str) -> str:
    if value not in SUPPORTED_LOCALES:
        raise ValueError(f"locale must be one of {SUPPORTED_LOCALES}, got '{value}'")
    return value


def locale_instruction(locale: str) -> str:
    if locale == "zh-TW":
        return (
            "Write all user-facing output in Traditional Chinese for Taiwan (zh-TW). "
            "Do not use Simplified Chinese. Use natural, professional Traditional Chinese "
            "that reads clearly for Taiwan-based legal and business audiences."
        )

    return "Write all user-facing output in English."


def append_locale_instruction(text: str, locale: str) -> str:
    return f"{text}\n\nOUTPUT LANGUAGE REQUIREMENT:\n- {locale_instruction(locale)}"
