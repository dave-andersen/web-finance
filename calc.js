"use strict";

// function getParameterByName(name) {
//     name = name.replace(/[\[\]]/g, "\\$&");
//     var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
//         results = regex.exec(window.location.href);
//     if (!results) return null;
//     if (!results[2]) return '';
//     return decodeURIComponent(results[2].replace(/\+/g, " "));
// }

function updateShare() {
  let form = byId("fwd");
  let data = new FormData(form);
  let queryString = new URLSearchParams(data).toString();

  console.log("Serialized form: " + queryString);
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
  var start = byId("fwd.start").value;
  var add = byId("fwd.add").value;
  var cpp = getAddFreqN("fwd.freq");

  var years = byId("fwd.years").value;
  var interest = byId("fwd.interest").value;
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
  updateAmount('fwd', amount);
  updateShare();
}

function updateBwd() {
  var final = byId("bwd.end").value;
  var years = byId("bwd.years").value;
  var interest = byId("bwd.interest").value;

  var cpp = getAddFreqN("bwd.freq");
  var expval = 1.0 + interest / (100.0 * cpp);
  var invexp = 1.0 / expval;

  var startamount = final * Math.pow(invexp, years * cpp);
  updateAmount('bwd', startamount);
}

function updateContrib() {
  var final = byId("contrib.end").value;
  var start = byId("contrib.start").value;
  var cpp = getAddFreqN("contrib.freq");
  var years = byId("contrib.years").value;
  var interest = byId("contrib.interest").value;

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
  updateAmount('contrib', add);
}

function updateInt() {
  var finalAmount = byId("int.end").value;
  var start = byId("int.start").value;
  var add = byId("int.add").value;
  var cpp = getAddFreqN("int.freq");
  var years = byId("int.years").value;

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

  updateAmount('int', interest);
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

//function handleIncomingParams(params) {
//    var p = getParametersByName('fwd')
// TODO:  Set the form fields if there are URL query fields present.
//}


document.addEventListener("DOMContentLoaded", (function() {
  doBind('#fwd', 'fwd.freq', updateFwd);
  doBind('#bwd', 'bwd.freq', updateBwd);
  doBind('#contrib', 'contrib.freq', updateContrib);
  doBind('#int', 'int.freq', updateInt);
  //			  handleIncomingParams();
}));
