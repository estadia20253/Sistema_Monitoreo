import cloudinary
import cloudinary.uploader
import cloudinary.api
import os

cloudinary.config(
    cloud_name = "decigylbc",
    api_key = "635337671942931",
    api_secret = "5ZhFjHbEmQJFsPf1QHCUANgR-RA"
)

def upload_image_to_cloudinary(file_path):
    response = cloudinary.uploader.upload(file_path)
    return response['secure_url']
