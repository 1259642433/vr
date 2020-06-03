<template>
    <div class="live">
        <video class="video-js my-video" ref="video"></video>
    </div>
</template>

<script>
import videojs from 'video.js'
import 'videojs-flash'

export default {
  name: 'Live',
  data () {
    return {
      player: null,
      opt: {
        techOrder: ['flash', 'html5'],
        sources: [{
          withCredentials: false,
          type: 'rtmp/flv',
          // rtmp://202.69.69.180:443/webcast/bshdlive-pc
          // rtmp://live.xshaitt.com/kxh/demo
          src: 'rtmp://202.69.69.180:443/webcast/bshdlive-pc'
        }, {
          withCredentials: false,
          type: 'application/x-mpegURL',
          // http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8
          // http://live.xshaitt.com/kxh/demo.m3u8
          src: 'http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8'
        }],
        controls: true,
        poster: 'https://images.pexels.com/photos/3518091/pexels-photo-3518091.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500'
      }
    }
  },
  mounted () {
    console.log(1, this.$refs.video)
    this.player = videojs(this.$refs.video, this.opt)
  }
}
</script>

<style lang="scss" scoped>
.live{
  position: relative;
  width: 100%;
  .video-js{
    width: 100%;
    height: 400px;
  }
}
</style>
