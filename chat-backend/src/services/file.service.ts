export class FileService {
  // Since we switched to local disk storage, Multer automatically saves the file.
  // We just need to return the URL that points to our local Express server.
  async getLocalFileUrl(filename: string): Promise<string> {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-production-url.com' 
      : `http://localhost:${process.env.PORT || 3000}`;
      
    return `${baseUrl}/uploads/${filename}`;
  }
}
