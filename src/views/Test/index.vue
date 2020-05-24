<template>
  <div class="vrlive">
    <video class="video-js my-video" ref="video"></video>
    <div class="func">
      <button @click="player.play()">播放</button>
      <button @click="player.pause()">暂停</button>
    </div>

  </div>
</template>

<script>
import videojs from 'video.js'
import 'videojs-flash'

require('./js/videojs-vr')
export default {
  name: 'VRLive',
  data () {
    return {
      player: null,
      opt: {
        techOrder: ['flash', 'html5'],
        sources: [{
          withCredentials: false,
          type: 'application/x-mpegURL',
          // http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8
          // http://live.xshaitt.com/kxh/demo.m3u8
          src: ' http://live.xshaitt.com/kxh/demo.m3u8'
        }, {
          withCredentials: false,
          type: 'rtmp/flv',
          // rtmp://202.69.69.180:443/webcast/bshdlive-pc
          // rtmp://live.xshaitt.com/kxh/demo
          src: 'rtmp://202.69.69.180:443/webcast/bshdlive-pc'
        }],
        controls: true,
        poster: 'https://images.pexels.com/photos/3518091/pexels-photo-3518091.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500'
      }
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    init () {
      this.player = videojs(this.$refs.video, this.opt)
      this.player.vr({ projection: '360' })
    },
    getRTMP (sourceURL, el) {
      el.id = 'rtmpVideo'
      console.log(el)
      this.player = videojs(el, {
        height: '432',
        sources: [{
          type: 'rtmp/flv',
          src: sourceURL
        }]
      })
      this.player.on('ready', function () {
        console.log('准备就绪')
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.vrlive{
  display: flex;
  flex-direction: column;
  align-items: center;
  .my-video{
    margin-top: 40px;
    width: 800px;
    height: 600px;
  }
  .func{
    display: flex;
    justify-content: center;
    margin-top: 20px;
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
