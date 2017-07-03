# Horizontal Page Scroller
Another JavaScript library

# Usage

Markup:
```html
<div class="my-awesome-wrapper">
  <div>Section</div>
  <div>Section</div>
  ...
</div>
<script type="text/javascript" src="js/hps.js">
```

JS:
```javascript
//Pass an object, class/id name or jQuery object. Leave empty for defaults
var hps = new HPS('.my-awesome-wrapper', {options});
//And we're ready to go!
```

Options:
```javascript
sectionClass: //String. This class will be added to every child of given wrapper. Default: hps-section
scrollCallback: //Function. Will fire up every 16.6ms passing freshest event as an argument. Default: false
touchMult: //Number. Multiplier for touch events. Default: -2
firefoxMult: //Number. Multiplier for Firefox mouse events. Default: 15
mouseMult: //Number. Multiplier for mouse events. Default: 1
ease: //Number. Easing amount for smooth scrolling. Default: 0.1
controls: //Object
  append: //Boolean. If true, appends two buttons for section changing. Default: true
  elementClass: //String. Class for wrapping element. Default: hps-controls
  prevButtonClass: //String. Class for "previous" button element. Default: hps-control-prev
  nextButtonClass: //String. Class for "next" button element. Default: hps-control-next
```

Public methods:
```javascript
var hps = new HPS('.my-awesome-wrapper', {options});
//Destroys an element, restores default document flow
hps.destroy();
```
