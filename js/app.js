let agentNumpad, callNotification, secondCallNotification;
const callNotificationElem = document.getElementById('callNotification');
const secondCallNotificationElem = document.getElementById('secondCallNotification');

const callTimeOuter = document.querySelector('#callNotification #call-time');
const callTimer = document.querySelector('#callNotification #call-time span#timer');
const callHoldStatus = document.querySelector('#callNotification #call-time span#hold-status');

const secondCallTimer = document.querySelector('#secondCallNotification #call-time span#timer');

const profileDropDown = document.getElementById("myDropdown");
const profileOnline = document.querySelector(".dropbtn #availability");

let service_app_token = 'Y2E2NzFmMGEtOGVmMC00ZDJjLTg4ZDUtOWY5MjMwZmJiZmIwNTMyNmFjOGItYjQ3_P0A1_01b5077a-1a53-460c-85f4-86fc245a6856'; // Add the service app account token here
const refresh_token = 'ZTBmMzE3MDYtM2Q1NS00MmM4LTg1MWUtOTE2NDFjMGRkYTkzZWE1OWEzZjgtYjBh_P0A1_01b5077a-1a53-460c-85f4-86fc245a6856';

class callNotificationElement {
    constructor(element,callTimerElement){
        this.callNotification = element;
        this.callNotificationTimer = new Timer(callTimerElement);
        this.callNotificationControls = this.callNotification.querySelector('.notifier-a-controls');
        this.callNotificationControls_mute = this.callNotificationControls.querySelector('.mute');
        this.callNotificationControls_hold = this.callNotificationControls.querySelector('.hold');
        this.callNotificationControls_transfer = this.callNotificationControls.querySelector('.transfer');
    }

    toggle(doWhat){
        if(doWhat === "close" || this.callNotification.classList.contains('show-notification')){
            this.callNotification.classList.remove('show-notification');
            setTimeout(() => { 
                this.callNotification.classList.remove('timestate');
                this.callNotificationTimer.stop();
            }, 2500);
        }
        else{
            this.callNotification.classList.add('show-notification');
        }
        return this.callNotificationTimer;
    }

    startTimer(){
        this.callNotification.classList.add('timestate');
        this.callNotificationTimer.start();
        this.callNotificationControls.classList.remove('hide-controls');
        return this.callNotificationTimer;
    }

    transferToggle(){
        this.callNotification.classList.contains('switch-look') ? this.callNotification.classList.remove('switch-look') : this.callNotification.classList.add('switch-look');
        this.callNotificationControls_transfer.classList.contains('in-progress') ? this.callNotificationControls_transfer.classList.remove('in-progress') : this.callNotificationControls_transfer.classList.add('in-progress');
    }

    holdToggle(){
        callTimeOuter.classList.contains('on-hold') ? callTimeOuter.classList.remove('on-hold') : callTimeOuter.classList.add('on-hold');
        this.callNotificationControls_hold.classList.contains('held') ? (
            this.callNotificationControls_hold.classList.remove('held'),
            this.callNotificationControls_hold.dataset.tooltip = "Hold"
        ) : (
            this.callNotificationControls_hold.classList.add('held'),
            this.callNotificationControls_hold.dataset.tooltip = "Resume"
        )
    }

    muteToggle(){
        this.callNotificationControls_mute.classList.contains('muted') ? (
            this.callNotificationControls_mute.classList.remove('muted'),
            this.callNotificationControls_mute.dataset.tooltip = "Mute"
        ) : (
            this.callNotificationControls_mute.classList.add('muted'),
            this.callNotificationControls_mute.dataset.tooltip = "Unmute"
        );
    }

    enableCompleteTransfer(){
        this.callNotificationControls_transfer.classList.remove('disabled');
    }
}

if(callNotificationElem){
    callNotification = new callNotificationElement(callNotificationElem,callTimer);
}

if(secondCallNotificationElem){
    secondCallNotification = new callNotificationElement(secondCallNotificationElem,secondCallTimer);
}

function fetchCallerBooking() {
    var mikeross = document.getElementsByClassName('hider-mikeross');
    var harveyspecter = document.getElementsByClassName('hider-harveyspecter');
    for (var i = 0; i < mikeross.length; i++) {
        mikeross[i].style.display = 'none';
    }
    for (var i = 0; i < harveyspecter.length; i++) {
        harveyspecter[i].style.display = 'block';
    }
}

function openCallNotification(callObj) {
  callNotification.toggle();
  callNotifyEvent.detail.callObject = callObj;
}

async function getGuestToken() {
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", `Bearer ${service_app_token}`);

  const raw = JSON.stringify({
    "subject": "Webex Click To Call Demo",
    "displayName": "WebexOne Demo"
  });

  const request = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow"
  };

  const response = await fetch("https://webexapis.com/v1/guests/token", request);
  const data = await response.json();
  
  if (data.accessToken) {
    return data.accessToken;
  }
}

async function getJweToken() {
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", `Bearer ${service_app_token}`);

  const payload =  JSON.stringify({
    "calledNumber": "5102", // Place your call queue/hunt group/destination number here
    "guestName": "" // Any guest name can be given
  });

  const request = {
    method: "POST",
    headers: myHeaders,
    body: payload,
    redirect: "follow"
  };
  
  const response = await fetch("https://webexapis.com/v1/telephony/click2call/callToken", request);
  const result = await response.json();
  if (result.callToken) {
    return result.callToken;
  }
}

async function getWebexConfig(userType) {
  /*
    Below values are hardcoded tokens for testing to be done for licensed users
    let access_token;
    if (userType === 'customer') {
      access_token = "";
    }
    else {
      access_token = ""
    }
  */

 const guestToken = await getGuestToken();
 console.log('Guest token fetch success: ', guestToken);
  const webexConfig = {
    config: {
      logger: {
        level: "debug", // set the desired log level
      },
      meetings: {
        reconnection: {
          enabled: true,
        },
        enableRtx: true,
      },
      encryption: {
        kmsInitialTimeout: 8000,
        kmsMaxTimeout: 40000,
        batcherMaxCalls: 30,
        caroots: null,
      },
      dss: {},
    },
    credentials: {
      access_token: guestToken,
    },
  };

  return webexConfig;
} 

async function getCallingConfig() {
    const jweToken = await getJweToken(); 
    console.log('Jwe Token: ', jweToken);

    const clientConfig = {
      calling: true,
      callHistory: true,
    };
  
    const loggerConfig = {
      level: "info",
    };
  
    const serviceData = { indicator: 'guestcalling', domain: '', guestName: 'Harvey'};
  
    const callingClientConfig = {
      logger: loggerConfig,
      discovery: {
        region: "US-EAST",
        country: "US",
      },
      serviceData,
      jwe: `${jweToken}`
    }

    const callingConfig = {
      clientConfig: clientConfig,
      callingClientConfig: callingClientConfig,
      logger: loggerConfig,
    };
  
    return callingConfig;
}

function openCallWindow(num) {
    if (num === '5007') {
        agentNumpad.classList.add('hidden');
        secondCallNotification.toggle();
    } else {
        callNotification.toggle();
    }
}

function openKeypad() {
    agentNumpad = document.getElementById('agent-numpad');
    agentNumpad.classList.contains('show') ? agentNumpad.classList.remove('show') : agentNumpad.classList.add('show');
}

function closeCallWindow() {
    callNotification.toggle("close");
    secondCallNotification.toggle("close");
}

function updateBtnText(btnType) {
    switch (btnType.innerText) {
      case "Mute":
        btnType.innerText = "Unmute";
        break;
      case "Unmute":
        btnType.innerText = "Mute";
        break;
      case "Hold":
        btnType.innerText = "Resume";
        break;
      case "Resume":
        btnType.innerText = "Hold";
        break;
      default:
        console.log("No case matched");
    }
}
  
function renderCallHistoryItem(call) {
    const avatarInitial = "Harvey Specter".charAt(0).toUpperCase();
    const directionIcon =
      call.direction === "OUTGOING" ? "fa-arrow-up" : "fa-arrow-down";
    const callDate = new Date(call.startTime).toLocaleDateString();
  
    return `
        <div class="call-history-item">
          <div class="call-avatar">${avatarInitial}</div>
          <div class="call-details">
            <div class="call-name">${
              call.other.name === "Priya Kesari"
                ? "Harvey Specter"
                : "Jane Doe"
            }</div>
            <div class="call-phone">${call.other.phoneNumber}</div>
          </div>
          <div class="call-indicator">
            <div class="call-date">${callDate}</div>
            <i class="fas ${directionIcon}" style="transform: rotate(45deg);"></i>
          </div>
          <div class="make-call">
              <button class="attend-call-btn"><i class="fa fa-phone" aria-hidden="true" style="transform: rotateZ(90deg);"></i></button>
          </div>
        </div>
      `;
}
  
function showHideCallHistory() {
    var container = document.querySelectorAll(".call-history-container")[0];
  
    if (container.classList.contains("visible")) {
      container.classList.remove("visible");
      container.style.height = "40px";
    } else {
      container.classList.add("visible");
      container.style.height = "30rem";
    }
}
  
function renderCallHistory(callHistoryData) {
    const callHistoryList = document.getElementById("callHistoryList");
    let callHistoryHTMLHeader = `
          <div id = "call-history-header" class="call-history-header" onclick="showHideCallHistory()">
              Call History
              <img src="../images/unfold.png" alt="" style="    margin-left: 180px;height: 20px;cursor: pointer;">
          </div>
      `;
    let callHistoryHTML = callHistoryData.map(renderCallHistoryItem).join("");
    callHistoryList.innerHTML = callHistoryHTMLHeader + callHistoryHTML;
    callHistoryList.classList.add("show-history");
}

function updateAvailability(){
    profileOnline.classList.add('online');
}
  
document.querySelector(".dropbtn").addEventListener("click", (event) => {
    if (profileDropDown.classList.contains("show")) {
      profileDropDown.classList.remove("show");
    } else {
      profileDropDown.classList.add("show");
    }
    event.stopPropagation();
});
  
  // Close the dropdown menu if the user clicks outside of it
window.onclick = () => {
    profileDropDown.classList.remove("show");
};

document.addEventListener('DOMContentLoaded', function () {
    var tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
    var tooltip = document.querySelector('.tooltip-calling');
  
    tooltipTriggers.forEach(function(trigger) {
      trigger.addEventListener('mouseover', function() {
        var tooltipText = this.getAttribute('data-tooltip');
        tooltip.textContent = tooltipText;
        
        var triggerRect = this.getBoundingClientRect();
        var tooltipRect = tooltip.getBoundingClientRect();
        
        tooltip.style.left = (triggerRect.left + (triggerRect.width - tooltipRect.width) / 2 + 10) + 'px';
        tooltip.style.top = triggerRect.top - tooltipRect.height - 25 + 'px'; // 10px for a little space above the tooltip
        
        tooltip.classList.add('show-tooltip');
      });
  
      trigger.addEventListener('mouseout', function() {
        tooltip.classList.remove('show-tooltip');
      });
    });
});

