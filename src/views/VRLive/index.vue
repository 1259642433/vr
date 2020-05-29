<template>
  <div class="vrlive">
    <div id="container"></div>
    <div class="func">
      <button @click="player.play()">播放</button>
      <button @click="player.pause()">暂停</button>
    </div>
    <video class="video-js" ref="video"></video>
  </div>
</template>

<script>
import * as THREE from 'three'
export default {
  name: 'VRLive',
  data () {
    return {
      camera: null,
      scene: null,
      renderer: null,
      mesh: null,
      video: null,
      hls: null,
      player: null
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    init () {
      const container = document.getElementById('container')
      this.initScene()
      this.initCamera(container)
      this.initRenderer(container)
      this.initContent()
      this.render()
      this.addMouseEvent(container)
      window.addEventListener('resize', this.onWindowResize(container))
    },
    initScene () {
      this.scene = new THREE.Scene()
    },
    initCamera (el) {
      this.camera = new THREE.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 1, 1100)
      this.camera.position.set(0, 0, 0)
      // this.camera.rotation.x = 0
    },
    initRenderer (el) {
      this.renderer = new THREE.WebGLRenderer()
      this.renderer.setSize(el.offsetWidth, el.offsetHeight)
      el.appendChild(this.renderer.domElement)
    },
    initVideo () {
      this.video = document.createElement('video')
      // this.video.muted = true
      // this.video.autoplay = true
      // this.video.loop = true
      // 在此处判断视频类型
      // http://live.xshaitt.com/kxh/demo.m3u8
      // http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8
      // this.getNormalVideo('./video/video_1.mp4', this.video)
      this.video.poster = 'https://images.pexels.com/photos/3518091/pexels-photo-3518091.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500'
      this.getHLS('http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8', this.video)
      // this.getRTMP('http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8', this.video)
      // this.getFLV('rtmp://202.69.69.180:443/webcast/bshdlive-pc', this.video)
      // this.video.play()
    },
    initContent () {
      this.initVideo()
      var geometry = new THREE.SphereBufferGeometry(300, 90, 90)
      geometry.scale(-1, 1, 1)
      var texture = new THREE.VideoTexture(this.video)
      texture.minFilter = THREE.LinearFilter
      texture.format = THREE.RGBFormat
      var material = new THREE.MeshBasicMaterial({ map: texture })
      this.mesh = new THREE.Mesh(geometry, material)
      this.mesh.position.set(0, 0, 0)
      this.scene.add(this.mesh)
    },
    render () {
      requestAnimationFrame(this.render)
      this.renderer.render(this.scene, this.camera)
    },
    onWindowResize (el) {
      this.camera.aspect = el.clientWidth / el.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(el.clientWidth, el.clientHeight)
    },
    getNormalVideo (sourceURL, el) {
      el.crossOrigin = 'Anonymous'
      const source = document.createElement('source')
      source.src = sourceURL
      el.appendChild(source)
      this.player = el
    },
    getHLS (sourceURL, el) {
      const Hls = require('hls.js')
      if (Hls.isSupported()) {
        this.hls = new Hls()
        this.hls.loadSource(sourceURL)
        this.hls.attachMedia(el)
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('加载成功')
        })
        this.hls.on(Hls.Events.ERROR, (event, data) => {
          console.log('加载失败')
        })
      }
      this.player = el
    },
    // 废弃
    // canvas?非原生video标签
    // getRTMP (sourceURL, el) {
    //   el.id = 'rtmpVideo'
    //   console.log(el)
    //   this.player = videojs(el, {
    //     sources: [{
    //       src: sourceURL
    //     }]
    //   })
    //   this.player.on('ready', function () {
    //     console.log('准备就绪')
    //   })
    // },
    getFLV (sourceURL, el) {
      const flv = require('flv.js')
      if (flv.isSupported()) {
        var flvPlayer = flv.createPlayer({
          type: 'rtmp/flv',
          url: sourceURL
        })
        flvPlayer.attachMediaElement(el)
        flvPlayer.load()
        this.player = flvPlayer
      }
    },
    addMouseEvent (el) {
      // 1
      const pre = {
        x: '',
        y: ''
      }
      // const cur = {
      //   x: '',
      //   y: ''
      // }
      let isDown = false
      const self = this
      el.onmousedown = function (event) {
        isDown = true
      }
      el.onmouseup = function (event) {
        isDown = false
      }
      el.onmousemove = function (event) {
        if (isDown) {
          console.log(event)
          console.log(pre)
          console.log(self.camera)
          if (event.movementY && !event.movementX) {
            self.camera.rotation.x -= event.movementY / 1000
          } else if (!event.movementY && event.movementX) {
            self.camera.rotation.y += event.movementX / 1000
          } else { pre.x = event.clientX }
          pre.y = event.clientY
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.vrlive{
  display: inline-block;
  width:100%;
  height: 100%;
  #container{
    display: block;
    margin: 40px auto;
    width: 100vw;
    height: auto;
    line-height: 0;
  }
  .func{
    margin: 0 auto;
    width: 800px;
    button{
      margin-right: 20px;
      padding: 10px 15px;
      font-size: 15px;
      color: white;
      background-image: linear-gradient( 135deg, #ABDCFF 10%, #0396FF 100%);
      border-radius: 5px;
      transition: all .3s;
      &:hover{
        transform: translateY(-2px);
        background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
        box-shadow: 0 2px 5px #40bad5;
      }
    }
  }
}
</style>
