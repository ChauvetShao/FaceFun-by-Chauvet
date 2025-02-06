class FaceDetectService {
  constructor() {
    this.tracking = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // 加载人脸检测模型
    try {
      this.tracking = await import('../../utils/tracking.js');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize face detection:', error);
      throw error;
    }
  }

  async detectFace(imageData) {
    if (!this.initialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const faces = this.tracking.detect(imageData);
        resolve(faces);
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new FaceDetectService(); 