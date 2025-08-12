// -*- coding: utf-8 -*-
// Life360 坐标纠偏脚本 (WGS-84 to GCJ-02)
// 仅限个人使用，基于标准偏移算法
// 作者: twfeiyu@gmail.com
// Github: https://github.com/twfeiyu
// 更新时间: 2025/08/12
// 来源：开源纠偏算法 (eviltransform 等)
// 针对 /v5/circles/devices/locations API 修正 latitude/longitude

// 常量定义
const PI = 3.1415926535897932384626;
const a = 6378245.0;  // 地球半径
const ee = 0.00669342162296594323;  // 偏心率平方

// 判断是否在中国大陆范围内（超出范围不纠偏）
function outOfChina(lat, lng) {
  if (lng < 72.004 || lng > 137.8347) return true;
  if (lat < 0.8293 || lat > 55.8271) return true;
  return false;
}

// 纬度转换辅助函数
function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

// 经度转换辅助函数
function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

// 主转换函数：WGS-84 to GCJ-02
function wgs2gcj(wgsLat, wgsLng) {
  if (outOfChina(wgsLat, wgsLng)) {
    return [wgsLat, wgsLng];  // 非大陆不纠偏
  }
  let dLat = transformLat(wgsLng - 105.0, wgsLat - 35.0);
  let dLng = transformLng(wgsLng - 105.0, wgsLat - 35.0);
  let radLat = wgsLat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  let sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
  return [wgsLat + dLat, wgsLng + dLng];
}

// MitM 脚本主逻辑
let body = $response.body;
let obj = JSON.parse(body);

if (obj.data && obj.data.items && Array.isArray(obj.data.items)) {
  for (let item of obj.data.items) {
    if (item.latitude && item.longitude) {
      console.log(`纠偏前 - Device: ${item.deviceId}, Lat: ${item.latitude}, Lng: ${item.longitude}`);
      let [newLat, newLng] = wgs2gcj(parseFloat(item.latitude), parseFloat(item.longitude));
      item.latitude = newLat;
      item.longitude = newLng;
      console.log(`纠偏后 - Device: ${item.deviceId}, Lat: ${newLat}, Lng: ${newLng}`);
    } else {
      console.log(`跳过 - Device: ${item.deviceId}, 无坐标`);
    }
  }
} else {
  console.log("无 items 数组，无法纠偏");
}

$done({ body: JSON.stringify(obj) });
