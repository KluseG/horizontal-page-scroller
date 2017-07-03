(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.HPS = factory();
  }
}(this, function () {
  var HPS = function(wrp, options){
    "use strict";

    var self = Object.create(HPS.prototype);

    var deviceWidth,
          deviceHeight,
          originStyles = [],
          animReq,
          controlsNode;

    var animFrame = window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      function(callback){ setTimeout(callback, 1000 / 60); };

    var cancelFrame = window.cancelAnimationFrame ||
      window.webkitCancelAnimationFrame ||
      window.mozCancelAnimationFrame ||
      window.msCancelAnimationFrame ||
      window.oCancelAnimationFrame ||
      function(callback){ clearTimeout(callback) };

    // Default Settings
    self.options = {
      sectionClass: 'hps-section',
      scrollCallback: false,
      touchMult: -2,
      firefoxMult: 15,
      mouseMult: 1,
      ease: 0.1,
      controls: {
        append: true,
        elementClass: 'hps-controls',
        prevButtonClass: 'hps-control-prev',
        nextButtonClass: 'hps-control-next'
      }
    };

    // User defined options (might have more in the future)
    if (options){
      Object.keys(options).forEach(function(key){
        self.options[key] = options[key];
      });
    }

    // By default, hps-wrapper class
    if (!wrp) {
      wrp = '.hps-wrapper';
    }

    if (typeof wrp === 'string') {
      var wrapper = document.querySelector(wrp);
    }
    else {
      var wrapper = wrp[0] || wrp;
    }

    // Now query selector
    if (wrapper && typeof wrapper === 'object') {
      self.wrapper = wrapper;
      if (wrapper.children.length > 0) {
        self.sections = wrapper.children;
      }
      else {
        // There is no children elements to swipe!
        throw new Error("Selected wrapper does not contain any child object.")
      }
    }
    // The wrapper don't exist
    else {
      throw new Error("The wrapper you're trying to select don't exist.");
    }

    // Let's kick this script off
    var init = function() {
      setupStyles();

      if (self.options.controls.append) {
        setupControls();
      }

      setupListeners();

      if (!self.options.scrollCallback) {
        animate();
      }
      else {
        callback();
      }
    };

    // Set styles that are CRUCIAL for the script to work
    var setupStyles = function() {
      originStyles = [];

      deviceWidth = window.innerWidth;
      deviceHeight = window.innerHeight;

      applyStyle(document.querySelector('body'), {
        overflow: 'hidden',
      });
      applyStyle(document.querySelector('html'), {
        overflow: 'hidden',
      });
      applyStyle(self.wrapper, {
        width: deviceWidth * self.sections.length
      });
      for (var elem of self.sections){
        applyStyle(elem, {
          float: 'left'
        });
        elem.classList.add(self.options.sectionClass);
      };
    }

    var setupControls = function() {
      controlsNode = document.createElement('div');
      controlsNode.classList.add(self.options.controls.elementClass);
      //temp
      controlsNode.style.cssText = 'position:fixed;top:0;left:0;z-index:999;';
      var arrowLeft = document.createElement('button');
      arrowLeft.classList.add(self.options.controls.prevButtonClass);
      //temp
      arrowLeft.style.cssText = 'font-size: 21px';
      arrowLeft.innerText = 'Previous';
      var arrowRight = document.createElement('button');
      arrowRight.classList.add(self.options.controls.nextButtonClass);
      //temp
      arrowRight.style.cssText = 'font-size: 21px';
      arrowRight.innerText = 'Next';
      controlsNode.appendChild(arrowLeft);
      controlsNode.appendChild(arrowRight);
      document.querySelector('body').appendChild(controlsNode);
    }

    // Let me make your website as it was before kicking this script off
    var destroyStyles = function() {
      if (originStyles.length > 0) {
        for (var key in originStyles) {
          applyStyle(originStyles[key].elem, originStyles[key].styles, false);
        }
      }
      for (var elem of self.sections){
        elem.classList.remove(self.options.sectionClass);
      };

      originStyles = [];
    }

    // Helper function, so the styling looks clean and lets us track changes
    var applyStyle = function(elem, css, saveOrigin = true) {
      if (saveOrigin) {
        var currentElem = {};
        currentElem.elem = elem;
        currentElem.styles = {
          transform: "",
          webkitTransform: "",
          mozTransform: "",
          msTransform: ""
        };
      }

      for (var property in css) {

        if (typeof css[property] === 'number') {
          css[property] += 'px';
        }

        saveOrigin ?  currentElem.styles[property] = elem.style[property] : false;
        elem.style[property] = css[property];
      }

      saveOrigin ? originStyles.push(currentElem) : false;
    }

    /****** SCROLL SETUP *****/
    var numListeners,
           listeners = [],
           touchStartX,
           touchStartY,
           bodyTouchAction,
           currentX = 0,
           targetX = 0,
           currentSection = 0;

  	var hasWheelEvent = 'onwheel' in document;
  	var hasMouseWheelEvent = 'onmousewheel' in document;
  	var hasTouch = 'ontouchstart' in document;
  	var hasTouchWin = navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 1;
  	var hasPointer = !!window.navigator.msPointerEnabled;
  	var hasKeyDown = 'onkeydown' in document;

  	var isFirefox = navigator.userAgent.indexOf('Firefox') > -1;

  	var event = {
  		y: 0,
  		x: 0,
  		deltaX: 0,
  		deltaY: 0,
  		originalEvent: null
  	};

  	var notify = function(e) {
  		event.x += event.deltaX;
  		event.y += event.deltaY;
  		event.originalEvent = e;

      if (!self.options.scrollCallback) {
        if (e.type == 'click') {
          targetX = -event.deltaX || event.deltaY
        }
        else {
          targetX += -event.deltaX || event.deltaY;
          targetX = Math.max( ((deviceWidth * self.sections.length) - deviceWidth) * -1, targetX);
          targetX = Math.min(0, targetX);
        }
      }
  	}

  	var onWheel = function(e) {
  		// In Chrome and in Firefox (at least the new one)
  		event.deltaX = e.wheelDeltaX || e.deltaX * -1;
  		event.deltaY = e.wheelDeltaY || e.deltaY * -1;

  		// for our purpose deltamode = 1 means user is on a wheel mouse, not touch pad
  		// real meaning: https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent#Delta_modes
  		if(isFirefox && e.deltaMode == 1) {
  			event.deltaX *= self.options.firefoxMult;
  			event.deltaY *= self.options.firefoxMult;
  		}

  		event.deltaX *= self.options.mouseMult;
  		event.deltaY *= self.options.mouseMult;

  		notify(e);
  	}

  	var onMouseWheel = function(e) {
  		// In Safari, IE and in Chrome if 'wheel' isn't defined
  		event.deltaX = (e.wheelDeltaX) ? e.wheelDeltaX : 0;
  		event.deltaY = (e.wheelDeltaY) ? e.wheelDeltaY : e.wheelDelta;

  		notify(e);
  	}

  	var onTouchStart = function(e) {
  		var t = (e.targetTouches) ? e.targetTouches[0] : e;
  		touchStartX = t.pageX;
  		touchStartY = t.pageY;
  	}

  	var onTouchMove = function(e) {
  		// e.preventDefault(); // < This needs to be managed externally
  		var t = (e.targetTouches) ? e.targetTouches[0] : e;

  		event.deltaX = (t.pageX - touchStartX) * self.options.touchMult;
  		event.deltaY = (t.pageY - touchStartY) * self.options.touchMult;

  		touchStartX = t.pageX;
  		touchStartY = t.pageY;

  		notify(e);
  	}

    var onControlsClick = function(e) {
      document.querySelector('.'+self.options.controls.nextButtonClass).removeAttribute('disabled');
      document.querySelector('.'+self.options.controls.prevButtonClass).removeAttribute('disabled');

      currentSection = Math.abs(Math.round(currentX / deviceWidth));

      if (e.target.className.indexOf(self.options.controls.nextButtonClass) > -1) {
        currentSection < self.sections.length - 1 ? currentSection++ : false;
        currentSection == self.sections.length - 1 ? e.target.setAttribute('disabled', 'true') : false;
      }
      else {
        currentSection > 0 ? currentSection-- : false;
        currentSection == 0 ? e.target.setAttribute('disabled', 'true') : false;
      }

      event.deltaX = self.sections[currentSection].offsetLeft;
      event.deltaY = -self.sections[currentSection].offsetLeft;

      notify(e);
    }

    // Just listen...
  	var setupListeners = function() {
  		if(hasWheelEvent) document.addEventListener("wheel", onWheel);
  		if(hasMouseWheelEvent) document.addEventListener("mousewheel", onMouseWheel);

  		if(hasTouch) {
  			document.addEventListener("touchstart", onTouchStart);
  			document.addEventListener("touchmove", onTouchMove);
  		}

  		if(hasPointer && hasTouchWin) {
  			bodyTouchAction = document.body.style.msTouchAction;
  			document.body.style.msTouchAction = "none";
  			document.addEventListener("MSPointerDown", onTouchStart, true);
  			document.addEventListener("MSPointerMove", onTouchMove, true);
  		}

      if (self.options.controls.append) {
        controlsNode.addEventListener("click", onControlsClick);
      }
    }

      // Stop listening!
    	var destroyListeners = function() {
    		if(hasWheelEvent) document.removeEventListener("wheel", onWheel);
    		if(hasMouseWheelEvent) document.removeEventListener("mousewheel", onMouseWheel);

    		if(hasTouch) {
    			document.removeEventListener("touchstart", onTouchStart);
    			document.removeEventListener("touchmove", onTouchMove);
    		}

    		if(hasPointer && hasTouchWin) {
    			document.body.style.msTouchAction = bodyTouchAction;
    			document.removeEventListener("MSPointerDown", onTouchStart, true);
    			document.removeEventListener("MSPointerMove", onTouchMove, true);
    		}

        if (self.options.controls.append) {
          controlsNode.removeEventListener("click", onControlsClick);
        }
    	}

    // Fire up every 16.6ms (60fps) thanks to "request animation frame".
    // Also use GPU acceleration thanks to translateZ!
    var animate = function() {
      animReq = animFrame(animate);
      currentX += (targetX - currentX) * self.options.ease;

      isNaN(currentX) || currentX > -self.options.ease ? currentX = 0 : false;

      var t = 'translateX(' + currentX + 'px) translateZ(0)';
      var s = self.wrapper.style;
      s["transform"] = t;
      s["webkitTransform"] = t;
      s["mozTransform"] = t;
      s["msTransform"] = t;
    }

    // Or fire up user's callback
    var callback = function() {
      animReq = animFrame(callback);
      self.options.scrollCallback(event);
    }

    // Bye ;(
    self.destroy = function() {
      cancelFrame(animReq);
      destroyListeners();
      destroyStyles();
      controlsNode.remove();
    };


    init();
    return self;
  };
  return HPS;
}));
