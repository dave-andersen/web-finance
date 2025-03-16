"use strict";

function getParameterByName(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function handleShareClick(event) {
  event.preventDefault();
  const formId = event.currentTarget.getAttribute('data-form');
  const form = document.getElementById(formId);
  
  // Create object to store form data
  const formData = {
    cal: formId
  };
  
  // Get all inputs within this specific form
  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    // Only include radio buttons if checked
    if (input.type === 'radio') {
      if (input.checked) {
        formData['freq'] = input.value;
      }
    } else if (input.value) {
      // Make sure the input belongs to this form by checking the ID
      const parts = input.id.split('.');
      if (parts.length === 2 && parts[0] === formId) {
        const fieldName = parts[1];
        formData[fieldName] = input.value;
      }
    }
  });
  
  // Base64 encode the data
  console.log("Form data: ", formData);
  console.log(JSON.stringify(formData));
  const encodedData = btoa(JSON.stringify(formData));
  
  // Create the share URL with a single 's' parameter
  let shareUrl;
  if (window.location.protocol === 'file:') {
    // For local file access, generate a proper file:// URL
    const fullPath = window.location.pathname;
    shareUrl = `file://${fullPath}?s=${encodedData}`;
  } else {
    // For http/https, use origin + pathname
    shareUrl = `${window.location.origin}${window.location.pathname}?s=${encodedData}`;
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(shareUrl).then(() => {
    alert("Shareable link copied to clipboard!");
  }).catch(err => {
    console.error('Could not copy link: ', err);
    // Fallback - show the URL to the user
    prompt("Copy this link to share your calculation:", shareUrl);
  });
}

function getAddFreqN(add_frequency_name) {
  var add_frequency = document.querySelector('input[name="' + add_frequency_name + '"]:checked').value;
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
  if (amount) {
    byId(calc + ".amount").textContent = amount.toFixed(2);
  } else {
    byId(calc + ".amount").textContent = "0";
  }
}

function updateFwd() {
  var start = byId("f.s").value;
  var add = byId("f.a").value;
  var cpp = getAddFreqN("f.f");

  var years = byId("f.y").value;
  var interest = byId("f.i").value;
  var growFactor = Math.pow((1.0 + interest / (100.0 * cpp)), years * cpp);
  var amount = start * growFactor;
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
  var final = byId("b.e").value;
  var years = byId("b.y").value;
  var interest = byId("b.i").value;

  var cpp = getAddFreqN("b.f");
  var expval = 1.0 + interest / (100.0 * cpp);
  var invexp = 1.0 / expval;

  var startamount = final * Math.pow(invexp, years * cpp);
  updateAmount('b', startamount);
}

function updateContrib() {
  var final = byId("c.e").value;
  var start = byId("c.s").value;
  var cpp = getAddFreqN("c.f");
  var years = byId("c.y").value;
  var interest = byId("c.i").value;

  var expval = 1.0 + interest / (100.0 * cpp);
  var invexp = 1.0 / expval;

  // The principal grows by a known amount:
  var growFactor = Math.pow(expval, years * cpp);
  var invGrowFactor = Math.pow(invexp, years * cpp);

  var pAmount = start * growFactor;
  if (pAmount) {
    final -= pAmount;
  }

  var add = final / ((growFactor - 1) / (interest / (100.0 * cpp)));
  updateAmount('c', add);
}

function updateInt() {
  var finalAmount = byId("i.e").value;
  var start = byId("i.s").value;
  var add = byId("i.a").value;
  var cpp = getAddFreqN("i.f");
  var years = byId("i.y").value;

  var projected = 0;
  var error = 99999;
  var interest_lo = 0;
  var interest_hi = 100;
  var interest = 50;
  var iters = 0;
  if ((!start && !add) || (!years)) {
    return;
  }
  while (Math.abs(error) > 0.1 && iters < 100) {
    iters += 1;
    interest = (interest_lo + interest_hi) / 2.0;
    var growFactor = Math.pow((1.0 + interest / (100.0 * cpp)), years * cpp);
    var amount = start * growFactor;
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
  var radioGuy = document.querySelectorAll('[name="' + radioId + '"]');
  for (var i = 0; i < radioGuy.length; ++i) {
    radioGuy[i].on('change', action);
  }
}

function handleIncomingParams() {
  // Get all URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check if we have the 's' parameter for base64 encoded data
  const encodedData = urlParams.get('s');
  if (encodedData) {
    try {
      // Decode base64 data
      const jsonData = atob(encodedData);
      const data = JSON.parse(jsonData);
      
      // Extract calculator type
      const calculator = data.cal;
      if (calculator) {
        // Populate form fields
        Object.keys(data).forEach(key => {
          if (key === 'calculator') return;
          
          if (key === 'freq') {
            // Handle radio buttons
            const radio = document.querySelector(`input[name="${calculator}.f"][value="${data[key]}"]`);
            if (radio) radio.checked = true;
          } else {
            // Handle regular inputs
            const input = document.getElementById(`${calculator}.${key}`);
            if (input) input.value = data[key];
          }
        });
        
        // Run the appropriate calculation
        if (calculator === 'f') updateFwd();
        if (calculator === 'b') updateBwd();
        if (calculator === 'c') updateContrib();
        if (calculator === 'i') updateInt();
        
        // Scroll to the relevant calculator
        const divId = 'div_' + calculator;
        const div = document.getElementById(divId);
        if (div) {
          // Smooth scroll to the element
          div.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Focus the first input in this form
          const firstInput = div.querySelector('input:not([type="radio"])');
          if (firstInput) {
            setTimeout(() => { 
              firstInput.focus();
              // Optional: select the text for easy editing
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
  
  // Original parameter handling (for non-base64 URLs)
  const formParams = {};
  for (const [key, value] of urlParams.entries()) {
    const parts = key.split('.');
    if (parts.length !== 2) continue;
    
    const form = parts[0];
    const param = parts[1];
    
    if (!formParams[form]) {
      formParams[form] = {};
    }
    formParams[form][param] = value;
  }
  
  // Apply parameters to each form
  for (const form in formParams) {
    const params = formParams[form];
    
    for (const param in params) {
      if (param === 'freq') {
        // Handle radio buttons
        const radio = document.querySelector(`input[name="${form}.f"][value="${params[param]}"]`);
        if (radio) {
          radio.checked = true;
        }
      } else {
        // Handle standard inputs
        const element = byId(`${form}.${param}`);
        if (element) {
          element.value = params[param];
        }
      }
    }
    
    // Run the appropriate calculation
    if (form === 'f') updateFwd();
    else if (form === 'b') updateBwd();
    else if (form === 'c') updateContrib();
    else if (form === 'i') updateInt();
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
