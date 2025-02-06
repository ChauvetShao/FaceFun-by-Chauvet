// pages/camera/camera.js
import Permission from '../../utils/permission.js'
// import getBehavior from '../../face-detect/behavior'
// import yuvBehavior from '../../face-detect/yuvBehavior'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    devicePosition: 'front', // 默认前置摄像头
    showEffects: false,
    currentEffect: '', // 当前选中的特效
    effectPosition: null, // 特效位置信息
    effects: [
      {
        id: '',
        name: '无特效',
        preview: '/images/effects/preview/none.png',
        image: ''
      },
      {
        id: 'cat',
        name: '猫咪',
        preview: '/images/effects/preview/cat.png',
        image: '/images/effects/preview/cat.png'


      },
      {
        id: 'dog',
        name: '小狗',
        preview: '/images/effects/preview/dog.png',
        image: '/images/effects/preview/dog.png'

      },
      {
        id: 'rabbit',
        name: '兔子',
        preview: '/images/effects/preview/rabbit.png',
        image: '/images/effects/preview/rabbit.png'

      },
      {
        id: 'crown',
        name: '皇冠',
        preview: '/images/effects/preview/crown.png',
        image: '/images/effects/preview/crown.png'

      }
    ],
    isProcessingFrame: false, // 添加标志位防止重复处理
    isVKAvailable: true,
    anchor2DList: [], // 添加人脸检测结果数组
    faceDetected: false, // 添加人脸检测状态
    canvasWidth: 0,
    canvasHeight: 0
  },

  // 将 processingTimeout 作为页面实例的属性
  processingTimeout: null,

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initCamera()
    this.preloadEffectImages()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    try {
      // 停止所有监听和追踪
      if (this.listener && typeof this.listener.stop === 'function') {
        this.listener.stop()
      }
      if (this.vkSession && typeof this.vkSession.destroy === 'function') {
        this.vkSession.destroy()
      }
    } catch (error) {
      console.error('清理资源失败:', error)
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 切换前后摄像头
  switchCamera() {
    this.setData({
      devicePosition: this.data.devicePosition === 'front' ? 'back' : 'front'
    });
  },

  // 拍照
  async takePhoto() {
    try {
        const ctx = wx.createCameraContext();
        
        // 获取设备信息用于设置 canvas 大小
        const systemInfo = wx.getSystemInfoSync();
        const canvasWidth = systemInfo.windowWidth;
        const canvasHeight = systemInfo.windowHeight;
        
        this.setData({
            canvasWidth,
            canvasHeight
        });

        // 拍照并获取图片
        const cameraRes = await new Promise((resolve, reject) => {
            ctx.takePhoto({
                quality: 'high',
                success: resolve,
                fail: reject
            });
        });

        // 创建 canvas 上下文
        const query = wx.createSelectorQuery();
        const canvas = await new Promise(resolve => {
            query.select('#captureCanvas')
                .fields({ node: true, size: true })
                .exec((res) => resolve(res[0].node));
        });

        const ctx2d = canvas.getContext('2d');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // 绘制相机图片
        const image = canvas.createImage();
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
            image.src = cameraRes.tempImagePath;
        });
        ctx2d.drawImage(image, 0, 0, canvasWidth, canvasHeight);

        // 如果有特效，绘制特效
        if (this.data.currentEffect && this.data.effectPosition) {
            const effectImage = canvas.createImage();
            await new Promise((resolve, reject) => {
                effectImage.onload = resolve;
                effectImage.onerror = reject;
                effectImage.src = this.data.currentEffectImage;
            });

            // 解析特效位置信息
            const pos = this.data.effectPosition;
            
            // 移除百分比符号并转换为数值
            const left = parseFloat(pos.left) / 100 * canvasWidth;
            const top = parseFloat(pos.top) / 100 * canvasHeight;
            const width = parseFloat(pos.width) / 100 * canvasWidth;
            const height = parseFloat(pos.height) / 100 * canvasHeight;

            // 应用变换
            ctx2d.save();
            
            // 移动到特效中心点
            ctx2d.translate(left, top);

            // 解析变换信息
            const transform = pos.transform;
            const angle = transform.match(/rotate\(([-\d.]+)deg\)/)?.[1] || 0;
            const scaleMatch = transform.match(/scale\(([-\d.]+),\s*1\)/);
            const scale = 1;

            // 应用旋转
            ctx2d.rotate(angle * Math.PI / 180);
            
            // 应用缩放
            ctx2d.scale(scale, 1);

            // 绘制特效（从中心点开始）
            ctx2d.drawImage(
                effectImage,
                -width / 2,  // 左上角 X
                -height / 2, // 左上角 Y
                width,      // 宽度
                height     // 高度
            );

            ctx2d.restore();

            // 添加调试日志
            console.log('特效绘制参数:', {
                left,
                top,
                width,
                height,
                angle,
                scale,
                canvasWidth,
                canvasHeight
            });
        }

        // 将 canvas 转换为图片
        const tempFilePath = await new Promise((resolve, reject) => {
            wx.canvasToTempFilePath({
                canvas,
                success: res => resolve(res.tempFilePath),
                fail: reject
            });
        });

        // 检查相册权限并保存
        const hasPhotoAuth = await Permission.checkPhotoAuth();
        if (!hasPhotoAuth) {
            const granted = await Permission.requestPhoto();
            if (!granted) {
                throw new Error('需要相册权限才能保存照片');
            }
        }

        await wx.saveImageToPhotosAlbum({
            filePath: tempFilePath
        });

        wx.showToast({
            title: '已保存到相册',
            icon: 'success'
        });

    } catch (error) {
        console.error('拍照或保存失败:', error);
        wx.showModal({
            title: '提示',
            content: error.message || '操作失败',
            showCancel: false
        });
    }
  },

  // 切换特效
  toggleEffects() {
    this.setData({
      showEffects: !this.data.showEffects
    });
  },

  // pages/camera/camera.js
async handleCameraFrame(frame) {
  if (this.data.isProcessingFrame) return;
  
  if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
  }
  
  try {
      this.setData({ isProcessingFrame: true });
      
      // 检查 VKSession 是否可用
      if (!this.vkSession || !this.data.isVKAvailable) {
          console.warn('VKSession 不可用');
          return;
      }

      // 验证帧数据
      if (!frame || !frame.data || !frame.width || !frame.height) {
          console.warn('无效的相机帧数据');
          return;
      }

      // 进行人脸检测
      const detectResult = await this.vkSession.detectFace({
          frameBuffer: frame.data,
          width: frame.width,
          height: frame.height,
          scoreThreshold: 0.5, // 降低阈值，提高检测灵敏度
          sourceType: 0
      });

      // 如果检测到人脸
      if (detectResult && detectResult.faces && detectResult.faces.length > 0) {
          const face = detectResult.faces[0];
          console.log('检测到人脸:', face);
          
          // 更新人脸检测状态
          this.setData({
              faceDetected: true
          });

          // 如果有特效，立即更新特效位置
          if (this.data.currentEffect) {
              wx.nextTick(() => {
                  this.updateEffectPosition(face, {
                      width: frame.width,
                      height: frame.height
                  });
              });
          }
      } else {
          // 未检测到人脸
          this.setData({
              faceDetected: false,
              effectPosition: null
          });
      }

  } catch (error) {
      console.error('处理相机帧失败:', error);
      if (error.message?.includes('session')) {
          this.setData({ isVKAvailable: false });
      }
  } finally {
      this.processingTimeout = setTimeout(() => {
          this.setData({ isProcessingFrame: false });
      }, 30); // 增加间隔时间，减少处理频率
  }
},

  // 修改验证帧数据的方法
  validateFrame(frame) {
    if (!frame || !frame.data || !frame.width || !frame.height) {
        console.warn('无效的相机帧数据:', frame);
        return false;
    }
    
    // 验证数据长度是否正确 (RGBA 格式，每个像素4字节)
    const expectedLength = frame.width * frame.height * 4;
    if (frame.data.byteLength !== expectedLength) {
        console.warn('相机帧数据长度不正确:', {
            expected: expectedLength,
            actual: frame.data.byteLength
        });
        return false;
    }
    
    return true;
  },

  // 添加VK会话重置方法
  async resetVKSession() {
    try {
        if (this.vkSession) {
            await this.vkSession.destroy();
        }
        await this.initCamera();
    } catch (error) {
        console.error('重置VK会话失败:', error);
    }
  },

  // 修改特效选择方法
  selectEffect(e) {
    const effectId = e.currentTarget.dataset.effect;
    const effect = this.data.effects.find(item => item.id === effectId);
    
    // 添加日志
    console.log('选择特效:', {
        effectId,
        effect,
        currentEffect: this.data.currentEffect
    });
    
    if (!effect) {
        console.error('未找到对应特效:', effectId);
        return;
    }

    this.setData({ 
        currentEffect: effect.id,
        currentEffectImage: effect.image,
        showEffects: false  // 选择后自动隐藏特效面板
    }, () => {
        // 确认特效设置成功
        console.log('特效设置完成:', {
            currentEffect: this.data.currentEffect,
            currentEffectImage: this.data.currentEffectImage
        });
    });
  },

  // 处理相机错误
  handleError(e) {
    console.error('相机错误:', e.detail);
    this.setData({
        isVKAvailable: false
    });
    wx.showModal({
        title: '提示',
        content: '相机初始化失败，请退出重试',
        showCancel: false,
        success: () => {
            wx.navigateBack();
        }
    });
  },

  // 添加特效图片加载错误处理
  handleEffectImageError(e) {
    console.error('特效图片加载失败:', e);
    this.setData({
        currentEffect: '',
        effectPosition: null
    });
    wx.showToast({
        title: '特效加载失败',
        icon: 'none'
    });
  },

  async initCamera() {
    try {
        // 检查版本兼容性
        if (!wx.createVKSession) {
            throw new Error('当前设备不支持 VK 特效功能')
        }

        // 检查并请求相机权限
        const hasAuth = await Permission.checkCameraAuth()
        if (!hasAuth) {
            const granted = await Permission.requestCamera()
            if (!granted) {
                throw new Error('相机权限未授权')
            }
        }

        // 创建相机上下文
        this.ctx = wx.createCameraContext()
        if (!this.ctx) {
            throw new Error('创建相机上下文失败')
        }

        // 修改 VKSession 配置
        this.vkSession = wx.createVKSession({
            track: {
                face: {
                    mode: 2, // 使用模式2，提供更多的人脸特征点
                }
            },
            version: 'v1'
        });

        if (!this.vkSession) {
            throw new Error('创建 VKSession 失败');
        }

        // 简化事件监听
        this.vkSession.on('updateAnchors', anchors => {
            if (anchors && anchors.length > 0) {
                const face = anchors[0];
                if (this.data.currentEffect) {
                    this.updateEffectPosition(face, {
                        width: this.ctx.width || 720,
                        height: this.ctx.height || 1280
                    });
                }
            }
        });

        // 启动 VKSession
        await new Promise((resolve, reject) => {
            this.vkSession.start(err => {
                if (err) {
                    console.error('VKSession 启动失败:', err);
                    reject(err);
                } else {
                    console.log('VKSession 启动成功');
                    resolve();
                }
            });
        });

        // 启动成功后开始追踪
        console.log('开始追踪');
        this.startTracking();

    } catch (error) {
        console.error('相机初始化失败:', error);
        this.setData({ isVKAvailable: false });
        wx.showToast({
            title: error.message || '相机初始化失败',
            icon: 'none'
        });
    }
},

  startTracking() {
    if (!this.ctx || !this.vkSession) {
        console.error('相机或VKSession未初始化');
        return;
    }

    try {
        this.listener = this.ctx.onCameraFrame(frame => {
            if (!this.data.isProcessingFrame) {
                this.handleCameraFrame(frame);
            }
        });

        if (this.listener) {
            this.listener.start({
                success: () => {
                    console.log('相机帧监听启动成功');
                },
                fail: (error) => {
                    console.error('启动相机帧监听失败:', error);
                    this.setData({ isVKAvailable: false });
                }
            });
        }
    } catch (error) {
        console.error('创建相机帧监听器失败:', error);
        this.setData({ isVKAvailable: false });
    }
  },

  updateEffectPosition(face, frame) {
    if (!face || !frame || !this.data.currentEffect) {
        console.warn('updateEffectPosition 参数无效');
        return;
    }

    try {
        const { points, origin, size, angle } = face;
        
        // 记录原始数据用于调试
        console.log('人脸数据:', {
            points: points?.length,
            origin,
            size,
            angle,
            frameWidth: frame.width,
            frameHeight: frame.height
        });

        // 根据不同特效调整位置和大小
        let sizeRatio = 1.0;
        let offsetY = 0;
        let offsetX = 0;

        switch (this.data.currentEffect) {
            case 'crown':
                sizeRatio = 1.4;
                offsetY = -0.15;
                offsetX = -0.1;
                break;
            case 'cat':
                sizeRatio = 1.3;
                offsetY = -0.1;
                offsetX = -0.1;
                break;
            case 'dog':
                sizeRatio = 1.3;
                offsetY = -0.1;
                offsetX = -0.1;
                break;
            case 'rabbit':
                sizeRatio = 1.8;
                offsetY = -0.2;
                offsetX = -0.2;
                break;
            default:
                sizeRatio = 1.0;
                offsetY = 0;
        }

        // 计算特效位置和大小
        const effectWidth = size.width * sizeRatio;
        const effectHeight = size.height * sizeRatio;
        
        // 计算偏移量（考虑人脸框的大小）
        const offsetYPixels = size.height * offsetY;
        const offsetXPixels = size.width * offsetX;

        // 计算最终位置（使用百分比定位）
        const newPosition = {
            left: `${(origin.x + offsetX) * 100}%`,
            top: `${(origin.y + offsetY) * 100}%`,
            width: `${effectWidth * 100}%`,
            height: `${effectHeight * 100}%`,
            transform: `translate(-50%, -50%) rotate(${angle || 0}deg) ` // 前置摄像头需要水平翻转
        };

        // 添加位置调试日志
        console.log('特效位置计算:', {
            originalX: origin.x,
            originalY: origin.y,
            finalLeft: newPosition.left,
            finalTop: newPosition.top,
            width: newPosition.width,
            height: newPosition.height
        });

        // 使用 nextTick 确保在下一帧更新
        wx.nextTick(() => {
            this.setData({
                effectPosition: newPosition
            });
        });

    } catch (error) {
        console.error('更新特效位置失败:', error);
    }
  },

  // 封装状态更新
  updateState(data) {
    return new Promise(resolve => {
      wx.nextTick(() => {
        this.setData(data, resolve)
      })
    })
  },

  // 预加载特效图片
  preloadEffectImages() {
    this.data.effects.forEach(effect => {
      if (effect.image) {
        // 先检查预览图
        wx.getImageInfo({
          src: effect.preview,
          success: () => {
            console.log('预览图加载成功:', effect.name);
            
            // 再加载特效图
            wx.getImageInfo({
              src: effect.image,
              success: () => {
                console.log('特效图片加载成功:', effect.name);
              },
              fail: (error) => {
                console.error('特效图片加载失败:', effect.name, error);
                // 移除加载失败的特效
                this.removeEffect(effect.id);
              }
            });
          },
          fail: (error) => {
            console.error('预览图加载失败:', effect.name, error);
            // 移除加载失败的特效
            this.removeEffect(effect.id);
          }
        });
      }
    });
  },

  // 添加移除特效的方法
  removeEffect(effectId) {
    const effects = this.data.effects.filter(effect => effect.id !== effectId);
    this.setData({ effects });
  }
});