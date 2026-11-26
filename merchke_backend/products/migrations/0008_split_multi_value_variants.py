"""
Split variants whose size or colour holds several options ("S, M, XL" / "Color Black, Red")
into one variant per combination, as new variants are now created (see products/variants.py).
The original row becomes the first combination, so order items pointing at it stay valid.
"""
from django.db import migrations

from products.variants import expand_variant_data


def split_variants(apps, schema_editor):
    ProductVariant = apps.get_model('products', 'ProductVariant')
    size_max = ProductVariant._meta.get_field('size').max_length
    color_max = ProductVariant._meta.get_field('color').max_length
    for variant in ProductVariant.objects.all():
        combos = list(expand_variant_data(
            {'size': variant.size, 'color': variant.color}, size_max, color_max,
        ))
        if len(combos) == 1 and (combos[0]['size'], combos[0]['color']) == (variant.size, variant.color):
            continue
        first, rest = combos[0], combos[1:]
        variant.size, variant.color = first['size'], first['color']
        variant.save(update_fields=['size', 'color'])
        ProductVariant.objects.bulk_create([
            ProductVariant(
                product_id=variant.product_id, size=c['size'], color=c['color'],
                custom_label=variant.custom_label, price_modifier=variant.price_modifier,
                stock=variant.stock, sku='',
            )
            for c in rest
        ])


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0007_alter_product_digital_file_listingfee'),
    ]

    operations = [
        migrations.RunPython(split_variants, migrations.RunPython.noop),
    ]
