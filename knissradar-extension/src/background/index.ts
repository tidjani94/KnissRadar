/// <reference types="chrome" />

chrome.runtime.onInstalled.addListener(() => {
  console.log("KnissRadar extension installed");
});

chrome.alarms.create("telemetry-flush", {
  periodInMinutes: 0.5,
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "telemetry-flush") {
    console.log("Telemetry flush alarm fired");
  }
});
