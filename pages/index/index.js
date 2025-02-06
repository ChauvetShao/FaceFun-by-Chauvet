import Permission from '../../utils/permission.js';

Page({
  data: {
    isFront: true,
    currentEffect: null,
    effects: ['cat', 'glasses', 'beauty'],
    hasCamera: false,
    audioContext: null
  },

  async onLoad() {
    const hasCamera = await Permission.checkCameraAuth();
    this.setData({
      hasCamera
    });
    this.initAudio();
  },

  initAudio() {
    try {
      const audioContext = wx.createInnerAudioContext();
      if (!audioContext) {
        throw new Error('创建音频上下文失败');
      }
      audioContext.src = '/audio/tap.mp3';
      audioContext.onError((res) => {
        const errorMsg = this.getAudioErrorMessage(res.errCode);
        console.error('音频错误:', {
          code: res.errCode,
          message: errorMsg,
          details: res
        });
      });
      this.setData({ audioContext });
    } catch (error) {
      console.error('初始化音频失败:', {
        message: error.message,
        stack: error.stack,
        details: error
      });
    }
  },

  getAudioErrorMessage(errCode) {
    const errorMessages = {
      10001: '系统错误',
      10002: '网络错误',
      10003: '文件错误',
      10004: '格式错误',
      '-1': '未知错误'
    };
    return errorMessages[errCode] || `未知错误码: ${errCode}`;
  },

  async playAudio() {
    const { audioContext } = this.data;
    if (!audioContext) {
      console.warn('音频上下文未初始化，尝试重新初始化');
      this.initAudio();
      if (!this.data.audioContext) {
        console.error('音频初始化失败');
        return false;
      }
    }
    try {
      await this.resetAudio();
      audioContext.play();
      return true;
    } catch (error) {
      console.error('播放音频失败:', {
        message: error.message,
        stack: error.stack,
        details: error
      });
      return false;
    }
  },

  async resetAudio() {
    const { audioContext } = this.data;
    try {
      audioContext.stop();
      audioContext.seek(0);
    } catch (error) {
      console.error('重置音频状态失败:', {
        message: error.message,
        stack: error.stack,
        details: error
      });
      throw error;
    }
  },

  async playTapSound() {
    const success = await this.playAudio();
    if (!success) {
      console.warn('播放点击音效失败');
    }
  },

  onUnload() {
    const { audioContext } = this.data;
    if (audioContext) {
      try {
        audioContext.destroy();
      } catch (error) {
        console.error('销毁音频上下文失败:', {
          message: error.message,
          stack: error.stack,
          details: error
        });
      }
    }
  },

  switchCamera() {
    this.setData({
      isFront: !this.data.isFront
    });
  },

  async takePhoto() {
    const context = wx.createCameraContext();
    try {
      const photo = await context.takePhoto({
        quality: 'high'
      });
      wx.saveImageToPhotosAlbum({
        filePath: photo.tempImagePath,
        success: () => {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          this.saveToHistory(photo.tempImagePath);
        },
        fail: (err) => {
          wx.showToast({
            title: '保存失败，请检查相册权限',
            icon: 'none'
          });
          console.error('保存照片到相册失败', err);
        }
      });
    } catch (error) {
      console.error('拍照失败', error);
      wx.showToast({
        title: '拍照失败',
        icon: 'none'
      });
    }
  },

  chooseEffect() {
    wx.showActionSheet({
      itemList: ['猫耳朵', '眼镜', '美颜'],
      success: (res) => {
        this.setData({
          currentEffect: this.data.effects[res.tapIndex]
        });
      }
    });
  },

  drawEffect(face) {
    const context = wx.createCanvasContext('faceCanvas');
    switch (this.data.currentEffect) {
      case 'cat':
        this.drawCatEars(context, face);
        break;
      case 'glasses':
        this.drawGlasses(context, face);
        break;
      case 'beauty':
        this.applyBeautyFilter(context, face);
        break;
    }
    context.draw();
  },

  saveToHistory(imagePath) {
    const history = wx.getStorageSync('photoHistory') || [];
    history.unshift({
      path: imagePath,
      date: new Date().toISOString()
    });
    wx.setStorageSync('photoHistory', history);
  },

  async navigateToCamera() {
    try {
      await this.playTapSound();
      
      const hasAuth = await Permission.checkCameraAuth();
      if (!hasAuth) {
        const granted = await Permission.requestCamera();
        if (!granted) {
          wx.showModal({
            title: '提示',
            content: '需要相机权限才能使用该功能',
            showCancel: false
          });
          return;
        }
      }

      wx.navigateTo({
        url: '/pages/camera/camera'
      });
    } catch (error) {
      console.error('相机权限检查失败:', error);
      wx.showToast({
        title: '无法访问相机',
        icon: 'none'
      });
    }
  },

  navigateToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  }
});