from decimal import Decimal

from django import template
from num2words import num2words

register = template.Library()


@register.filter
def get_item(dictionary, key):
    """Lookup a dict value by key in templates: {{ mydict|get_item:somekey }}."""
    if dictionary is None:
        return None
    return dictionary.get(key)


@register.filter
def numero_a_letras(value):
    try:
        amount = Decimal(str(value))
        integer_part = int(amount)
        cents = int((amount - integer_part) * 100)
        words = num2words(integer_part, lang='es').upper()
        return f"{words} PESOS {cents:02d}/100 M.N."
    except Exception:
        return str(value)


@register.filter
def moneda(value):
    try:
        amount = Decimal(str(value))
        return f"${amount:,.2f}"
    except Exception:
        return str(value)
