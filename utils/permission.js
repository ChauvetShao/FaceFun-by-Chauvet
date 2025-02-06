const Permission = {
  // 检查相机权限
  async checkCameraAuth() {
    try {
      const res = await wx.getSetting()
      return !!res.authSetting['scope.camera']
    } catch (error) {
      console.error('检查相机权限失败:', error)
      return false
    }
  },

  // 请求相机权限
  async requestCamera() {
    try {
      await wx.authorize({ scope: 'scope.camera' })
      return true
    } catch (error) {
      console.error('请求相机权限失败:', error)
      return false
    }
  },

  // 检查相册权限
  async checkPhotoAuth() {
    try {
      const res = await wx.getSetting()
      return !!res.authSetting['scope.writePhotosAlbum']
    } catch (error) {
      console.error('检查相册权限失败:', error)
      return false
    }
  },

  // 请求相册权限
  async requestPhoto() {
    try {
      await wx.authorize({ scope: 'scope.writePhotosAlbum' })
      return true
    } catch (error) {
      console.error('请求相册权限失败:', error)
      return false
    }
  }
}

export default Permission 