from django.conf import settings
from django.utils.module_loading import import_string


def raw_file_storage():
    """
    Storage for non-image uploads (digital products, MP3s, CVs).
    Callable so swapping backends via CLOUDINARY_URL doesn't create migrations.
    """
    return import_string(settings.RAW_FILE_STORAGE)()
