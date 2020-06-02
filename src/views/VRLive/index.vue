<template>
  <div class="vrlive">
    <div class="vr-video">
      <div id="videoContainer">
      </div>
      <div class="statistics">
        <p>status：{{playVariables.status}}</p>
      </div>
      <div class="func">
        <div v-if="playVariables.status == 'pause'" @click="player.play()"  class="btns-play">
          <i class="iconfont icon-icon_play"></i>
        </div>
        <div v-else-if="playVariables.status == 'playing'" @click="player.pause()"  class="btns-pause">
          <i class="iconfont icon-ai07"></i>
        </div>
        <div v-else-if="playVariables.status == 'loading'" class="loading">
          <div class="border"></div>
          <div class="slow"></div>
          <div class="fast"></div>
        </div>
      </div>
    </div>
    <div class="playType">
      <button @click="getNormalVideo('http://www.wangwentehappy.tk/static/video/1.mp4', video)">普通视频</button>
      <button @click="getHLS('http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8', video)">hls</button>
      <button>rtmp</button>
      <button>flv</button>
    </div>
    <video src="http://144.34.165.131:12577/static/file/storageArea/1.mp4" controls></video>
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
      player: null,
      playVariables: {
        type: '',
        status: 'pause'
      }
    }
  },
  watch: {
    'playVariables.status' () {
      // console.log(this.playVariables.status)
      // console.log(this.video)
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    init () {
      const container = document.getElementById('videoContainer')
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
      this.video.preload = 'auto'
      this.video.crossOrigin = 'anonymous'
      const self = this
      this.video.addEventListener('waiting', function (event) {
        self.playVariables.status = 'loading'
      })
      this.video.addEventListener('playing', function (event) {
        self.playVariables.status = 'playing'
      })
      this.video.addEventListener('pause', function (event) {
        self.playVariables.status = 'pause'
      })
      this.video.addEventListener('canplay', function (event) {
        if (self.playVariables.status === 'loading') {
          self.playVariables.status = 'playing'
        }
      })
      // 判断视频类型
      // http://live.xshaitt.com/kxh/demo.m3u8
      // http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8
      this.getNormalVideo('https://www.wangwentehappy.tk/static/video/1.mp4', this.video)
      // this.getHLS('http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8', this.video)
      // this.getRTMP('http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8', this.video)
      // this.getFLV('rtmp://202.69.69.180:443/webcast/bshdlive-pc', this.video)
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
    getNormalVideo (sourceURL, el) {
      const source = document.createElement('source')
      source.src = sourceURL
      source.type = 'video/mp4'
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
    onWindowResize (el) {
      this.camera.aspect = el.clientWidth / el.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(el.clientWidth, el.clientHeight)
    },
    addMouseEvent (el) {
      // TODO 对接鼠标移动事件
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
            self.camera.rotation.x -= event.movementY / 500
          } else if (!event.movementY && event.movementX) {
            self.camera.rotation.y += event.movementX / 500
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

  .vr-video{
    position: relative;
    margin: auto;
    #videoContainer{
    height: calc(100vw / 16 * 9);
    line-height: 0;
    }
    .func{
      position: absolute;
      z-index: 2;
      top: 50%;
      left: 50%;
      transform: translate(-50%,-50%);
      height: 50px;
      font-size: 16px;
      .loading{
        position: relative;
        border-radius: 50%;
        width: 3em;
        height: 3em;
        .border{
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 0.45em solid rgba(99, 149, 168, 0.5);
          border-radius: 50%;
        }
        .slow{
          position: absolute;
          z-index: 2;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-width: 0.45em;
          border-style: solid;
          border: 0.45em solid rgba(0, 0, 0, 0);
          border-top-color: rgb(7, 186, 241);
          animation: slow 1.5s linear infinite;
          border-radius: 50%;
        }
        .fast{
          position: absolute;
          z-index: 1;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-width: 0.45em;
          border-style: solid;
          border: 0.45em solid rgba(0, 0, 0, 0);
          border-top-color: rgb(10, 126, 161);
          animation: fast 0.75s linear infinite;
          border-radius: 50%;
        }
        @keyframes slow {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fast {
          0% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(45deg);
          }
          75% {
            transform: rotate(315deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      }

      .btns-play,.btns-pause{
        i{
          font-size: 4em;
          color: rgba(255,255,255,1);
          transition: color .3s;
        }
        &:hover{
          cursor: pointer;
          i{
            color: rgba(255,255,255,0.6);
          }
        }
      }
    }
    .statistics{
      position: absolute;
      z-index: 1;
      top: 1em;
      left: 1em;
      padding: 0.2em 1em;
      font-size: 13px;
      color: white;
      background-color: rgba(0,0,0,0.4);
      border-radius: 0.2em;
    }
  }
  .playType{
    display: flex;
    justify-content: center;
    margin-top: 30px;
    width: 100vw;
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
  video{
    margin-top: 20px;
    width: 100%;
  }
}
</style>
