import cloudinary
import cloudinary.uploader
import cloudinary.api
import os

cloudinary.config(
    cloud_name = "decigylbc",
    api_key = "165633913883323",
    api_secret = "4uQdrS_hzZbJTh_hwzUPIx7GMDw"
)

def upload_image_to_cloudinary(file_path):
    response = cloudinary.uploader.upload(file_path)
    return response['secure_url']
