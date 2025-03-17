"use strict";

function getParameterByName(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function handleShareClick(event) {
  event.preventDefault();
  const formId = event.currentTarget.getAttribute('data-form');
  const form = document.getElementById(formId);
  
  const formData = {
    cal: formId
  };
  
  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    if (input.type === 'radio') {
      if (input.checked) {
        formData['freq'] = input.value;
      }
    } else if (input.value) {
      const parts = input.id.split('.');
      if (parts.length === 2 && parts[0] === formId) {
        const fieldName = parts[1];
        formData[fieldName] = input.value;
      }
    }
  });
  
  console.log(JSON.stringify(formData));
  const encodedData = btoa(JSON.stringify(formData));
  
  let shareUrl;
  if (window.location.protocol === 'file:') {
    const fullPath = window.location.pathname;
    shareUrl = `file://${fullPath}?s=${encodedData}`;
  } else {
    shareUrl = `${window.location.origin}${window.location.pathname}?s=${encodedData}`;
  }
  
  navigator.clipboard.writeText(shareUrl).then(() => {
    alert("Shareable link copied to clipboard!");
  }).catch(err => {
    console.error('Could not copy link: ', err);
    prompt("Copy this link to share your calculation:", shareUrl);
  });
}

function getAddFreqN(add_frequency_name) {
  const add_frequency = document.querySelector('input[name="' + add_frequency_name + '"]:checked').value;
  if (add_frequency == "monthly") {
    return 12;
  }
  if (add_frequency == "weekly") {
    return 52;
  }
  return 1;
}

var byId = function(id) {
  return document.getElementById(id);
}

function updateAmount(calc, amount) {
  let amount_string = amount.toFixed(2);
  if (amount == 0) {
    amount_string = "0";
  }
  byId(calc + ".amount").textContent = amount_string;
}

function updateFwd() {
  const start = byId("f.s").value;
  const add = byId("f.a").value;
  const cpp = getAddFreqN("f.f");

  const years = byId("f.y").value;
  const interest = byId("f.i").value;
  const growFactor = Math.pow((1.0 + interest / (100.0 * cpp)), years * cpp);
  let amount = start * growFactor;
  if (add) {
    if (!amount) {
      amount = 0.0;
    }
    if (growFactor > 1) {
      amount += add * (growFactor - 1) / (interest / (100.0 * cpp));
    } else {
      amount += (add * years * cpp);
    }
  }
  updateAmount('f', amount);
}

function updateBwd() {
  const final = byId("b.e").value;
  const years = byId("b.y").value;
  const interest = byId("b.i").value;

  const cpp = getAddFreqN("b.f");
  const expval = 1.0 + interest / (100.0 * cpp);
  const invexp = 1.0 / expval;

  const startamount = final * Math.pow(invexp, years * cpp);
  updateAmount('b', startamount);
}

function updateContrib() {
  let final = byId("c.e").value;
  const start = byId("c.s").value;
  const cpp = getAddFreqN("c.f");
  const years = byId("c.y").value;
  const interest = byId("c.i").value;

  const expval = 1.0 + interest / (100.0 * cpp);

  // The principal grows by a known amount:
  const growFactor = Math.pow(expval, years * cpp);

  let pAmount = start * growFactor;
  if (pAmount) {
    final -= pAmount;
  }

  let add = final / ((growFactor - 1) / (interest / (100.0 * cpp)));
  updateAmount('c', add);
}

function updateInt() {
  var finalAmount = byId("i.e").value;
  const start = byId("i.s").value;
  var add = byId("i.a").value;
  var cpp = getAddFreqN("i.f");
  const years = byId("i.y").value;

  let error = 99999;
  let interest_lo = 0;
  let interest_hi = 100;
  let interest = 50;
  let iters = 0;
  if ((!start && !add) || (!years)) {
    return;
  }
  while (Math.abs(error) > 0.1 && iters < 100) {
    iters += 1;
    interest = (interest_lo + interest_hi) / 2.0;
    let growFactor = Math.pow((1.0 + interest / (100.0 * cpp)), years * cpp);
    let amount = start * growFactor;
    if (add) {
      amount += add * (growFactor - 1) / (interest / (100.0 * cpp));
    }
    error = finalAmount - amount;
    if (error > 0) {
      interest_lo = interest;
    } else {
      interest_hi = interest;
    }
  }
  updateAmount('i', interest);  
}

var $ = document.querySelectorAll.bind(document);
Element.prototype.on = Element.prototype.addEventListener;

function doBind(id, radioId, action) {
  $(id)[0].on('submit', action);
  $(id)[0].on('keyup', action);
  $(id)[0].on('mouseup', action);
  let radioGuy = document.querySelectorAll('[name="' + radioId + '"]');
  for (let i = 0; i < radioGuy.length; ++i) {
    radioGuy[i].on('change', action);
  }
}

function handleIncomingParams() {
  const urlParams = new URLSearchParams(window.location.search);
  
  const encodedData = urlParams.get('s');
  if (encodedData) {
    try {
      const jsonData = atob(encodedData);
      const data = JSON.parse(jsonData);
      const calculator = data.cal;
      if (calculator) {
        // Populate form fields
        Object.keys(data).forEach(key => {
          if (key === 'calculator') return;
          
          if (key === 'freq') {
            const radio = document.querySelector(`input[name="${calculator}.f"][value="${data[key]}"]`);
            if (radio) radio.checked = true;
          } else {
            const input = document.getElementById(`${calculator}.${key}`);
            if (input) input.value = data[key];
          }
        });
        
        if (calculator === 'f') updateFwd();
        if (calculator === 'b') updateBwd();
        if (calculator === 'c') updateContrib();
        if (calculator === 'i') updateInt();
        
        // Scroll to the relevant calculator
        const divId = 'div_' + calculator;
        const div = document.getElementById(divId);
        if (div) {
          div.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Focus the first input in this form
          const firstInput = div.querySelector('input:not([type="radio"])');
          if (firstInput) {
            setTimeout(() => { 
              firstInput.focus();
              firstInput.select();
            }, 500); // Short delay to allow smooth scrolling to complete
          }
        }
      }
    } catch (e) {
      console.error('Error parsing shared data:', e);
    }
    return;
  }
}

document.addEventListener("DOMContentLoaded", (function() {
  doBind('#f', 'f.f', updateFwd);
  doBind('#b', 'b.f', updateBwd);
  doBind('#c', 'c.f', updateContrib);
  doBind('#i', 'i.f', updateInt);
  
  // Add event listeners to share links
  const shareLinks = document.querySelectorAll('.share-link');
  for (let i = 0; i < shareLinks.length; i++) {
    shareLinks[i].addEventListener('click', handleShareClick);
  }
  
  // Handle incoming parameters if any
  handleIncomingParams();
}));
