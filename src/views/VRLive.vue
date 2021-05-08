<template>
    <div class="vr-live">
      <p>{{opt.source.src}}</p>
      <div class="container">
        <vr-live :option="opt"></vr-live>
      </div>
    </div>
</template>

<script>
import vrLive from '@c/VRLive'
export default {
  components: {
    vrLive
  },
  data () {
    return {
      opt: {
        statistics: true, // 统计信息
        source: {
          /*
            视频类型
            Normal
            HLS
            FLV
          */
          type: 'normal',
          /*
          测试地址
          https://www.wangwentehappy.tk/assets/video/1.mp4
          http://playertest.longtailvideo.com/adaptive/bipbop/gear4/prog_index.m3u8
          http://localhost:9001/live/wwt.flv
          http://localhost:9001/live/wwt/index.m3u8
          */
          url: 'https://www.ashenone.tk/public/video/1.mp4'
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.vr-live{
  display: inline-block;
  width: 100%;
  height: 100%;
  .container{
    margin: 80px auto 0 auto;
    padding: 15px;
    width: 70vw;
    height: calc(70vw / 16 * 9);
    background: rgba(125,125,125,1);
    border-radius: 10px;
  }
  @media screen and(max-width:768px) {
    .container{
      margin: 0;
      padding: 0;
      width: 100vw;
      height: calc(100vw / 16 * 9);
      background: none;
      border-radius: 0;
    }
  }
}
</style>
