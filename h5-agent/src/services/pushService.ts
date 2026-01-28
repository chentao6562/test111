import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { post } from '../api';
import router from '../router';

/**
 * 推送通知服务
 * 仅在Capacitor原生环境中有效
 */
export async function initPushNotifications() {
  // 仅在原生环境中初始化
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] 非原生环境，跳过推送初始化');
    return;
  }

  try {
    // 请求推送权限
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') {
      console.log('[Push] 用户拒绝推送权限');
      return;
    }

    // 注册推送
    await PushNotifications.register();

    // 监听注册成功事件
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] 注册成功，设备token:', token.value);
      // 上报token到后端
      try {
        await post('/auth/device-token', {
          token: token.value,
          platform: 'android'
        });
        console.log('[Push] 设备token上报成功');
      } catch (e) {
        console.error('[Push] 上报token失败:', e);
      }
    });

    // 监听注册失败
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] 注册失败:', error);
    });

    // 监听推送消息（应用在前台时）
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] 收到推送:', notification);
      // 前台时可以显示自定义Toast或更新UI
    });

    // 监听推送点击（用户点击通知）
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[Push] 用户点击通知:', notification);
      // 根据通知类型跳转到对应页面
      handleNotificationClick(notification.notification.data);
    });

    console.log('[Push] 推送服务初始化完成');
  } catch (error) {
    console.error('[Push] 初始化失败:', error);
  }
}

/**
 * 处理通知点击跳转
 */
function handleNotificationClick(data: any) {
  if (!data) return;

  switch (data.type) {
    case 'RESERVATION_STATUS':
      // 跳转到预约详情
      if (data.reservationId) {
        router.push(`/reservations/${data.reservationId}`);
      }
      break;
    case 'COMMISSION_RECEIVED':
      // 跳转到分润中心
      router.push('/commission');
      break;
    case 'COUPON_RECEIVED':
      // 跳转到代金券页面
      router.push('/coupons');
      break;
    case 'TEAM_NEW_MEMBER':
      // 跳转到团队页面
      router.push('/team');
      break;
    default:
      // 默认跳转到首页
      router.push('/');
  }
}
