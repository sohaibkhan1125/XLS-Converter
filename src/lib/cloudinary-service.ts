
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import streamifier from 'streamifier';

// Configure Cloudinary with environment variables
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Ensure secure URLs
});

/**
 * Uploads a file buffer to Cloudinary.
 * @param fileBuffer The buffer of the file to upload.
 * @returns A promise that resolves with the Cloudinary upload response.
 */
export const uploadToCloudinary = (fileBuffer: Buffer): Promise<UploadApiResponse | undefined> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto', // Automatically detect resource type (e.g., pdf)
                folder: 'user_documents', // Optional: Store in a specific folder
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

/**
 * Deletes a file from Cloudinary using its public ID.
 * @param publicId The public ID of the file to delete.
 * @returns A promise that resolves with the deletion result.
 */
export const deleteFromCloudinary = (publicId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) {
                console.error('Cloudinary deletion error:', error);
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
};
