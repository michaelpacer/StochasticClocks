/**
 * CoolClock 2.1.4
 * Copyright 2010, Simon Baird
 * Released under the BSD License.
 *
 * Display an analog clock using canvas.
 * http:// JS:randomibis.com/coolclock/
 *
 */

// JS: Constructor for CoolClock objects
window.CoolClock = function(options) {
    return this.init(options);
}

// JS: Config contains some defaults, and clock skins
CoolClock.config = {
    tickDelay: 1000,
    longTickDelay: 15000,
    defaultRadius: 85,
    renderRadius: 100,
    defaultSkin: "swissRail",
    // JS: Should be in skin probably...
    // JS: (TODO: allow skinning of digital display)
    showSecs: true,
    showAmPm: true,

    skins:  {
        // JS: There are more skins in moreskins.js
        // JS: Try making your own skin by copy/pasting one of these and tweaking it
        swissRail: {
            outerBorder: { lineWidth: 2, radius:95, color: "black", alpha: 1 },
            smallIndicator: { lineWidth: 2, startAt: 88, endAt: 92, color: "#CCCCCC", alpha: 1 },
            largeIndicator: { lineWidth: 2, startAt: 79, endAt: 92, color: "gray", alpha: 1 },
            hourHand: { lineWidth: 5, startAt: -15, endAt: 50, color: "black", alpha: 1 },
            minuteHand: { lineWidth: 3, startAt: -15, endAt: 75, color: "black", alpha: 1 },
            secondHand: { lineWidth: 1, startAt: -20, endAt: 85, color: "red", alpha: 1 },
            secondDecoration: { lineWidth: 1, startAt: 70, radius: 4, fillColor: "red", color: "red", alpha: 1 }
        },
        chunkySwiss: {
            outerBorder: { lineWidth: 4, radius:97, color: "black", alpha: 1 },
            smallIndicator: { lineWidth: 4, startAt: 89, endAt: 93, color: "black", alpha: 1 },
            largeIndicator: { lineWidth: 8, startAt: 80, endAt: 93, color: "black", alpha: 1 },
            hourHand: { lineWidth: 12, startAt: -15, endAt: 60, color: "black", alpha: 1 },
            minuteHand: { lineWidth: 10, startAt: -15, endAt: 85, color: "black", alpha: 1 },
            secondHand: { lineWidth: 4, startAt: -20, endAt: 85, color: "red", alpha: 1 },
            secondDecoration: { lineWidth: 2, startAt: 70, radius: 8, fillColor: "red", color: "red", alpha: 1 }
        },
        chunkySwissOnBlack: {
            outerBorder: { lineWidth: 4, radius:97, color: "white", alpha: 1 },
            smallIndicator: { lineWidth: 4, startAt: 89, endAt: 93, color: "white", alpha: 1 },
            largeIndicator: { lineWidth: 8, startAt: 80, endAt: 93, color: "white", alpha: 1 },
            hourHand: { lineWidth: 12, startAt: -15, endAt: 60, color: "white", alpha: 1 },
            minuteHand: { lineWidth: 10, startAt: -15, endAt: 85, color: "white", alpha: 1 },
            secondHand: { lineWidth: 4, startAt: -20, endAt: 85, color: "red", alpha: 1 },
            secondDecoration: { lineWidth: 2, startAt: 70, radius: 8, fillColor: "red", color: "red", alpha: 1 }
        }

    },

    // JS: Test for IE so we can nurse excanvas in a couple of places
    isIE: !!document.all,

    // JS: Will store (a reference to) each clock here, indexed by the id of the canvas element
    clockTracker: {},

    // JS: For giving a unique id to coolclock canvases with no id
    noIdCount: 0
};

// JS: Define the CoolClock object's methods
CoolClock.prototype = {

    // JS: Initialise using the parameters parsed from the colon delimited class
    init: function(options) {
        // JS: Parse and store the options
        this.canvasId       = options.canvasId;
        this.skinId         = options.skinId || CoolClock.config.defaultSkin;
        this.displayRadius  = options.displayRadius || CoolClock.config.defaultRadius;
        this.showSecondHand = typeof options.showSecondHand == "boolean" ? options.showSecondHand : true;
        this.gmtOffset      = (options.gmtOffset != null && options.gmtOffset != '') ? parseFloat(options.gmtOffset) : null;
        this.showDigital    = typeof options.showDigital == "boolean" ? options.showDigital : false;
        this.logClock       = typeof options.logClock == "boolean" ? options.logClock : false;
        this.logClockRev    = typeof options.logClock == "boolean" ? options.logClockRev : false;

        this.tickDelay      = CoolClock.config[ this.showSecondHand ? "tickDelay" : "longTickDelay" ];

        // JS: Get the canvas element
        this.canvas = document.getElementById(this.canvasId);

        // JS: Make the canvas the requested size. It's always square.
        this.canvas.setAttribute("width",this.displayRadius*2);
        this.canvas.setAttribute("height",this.displayRadius*2);
        this.canvas.style.width = this.displayRadius*2 + "px";
        this.canvas.style.height = this.displayRadius*2 + "px";

        // JS: Explain me please...?
        this.renderRadius = CoolClock.config.renderRadius;
        this.scale = this.displayRadius / this.renderRadius;

        // JS: Initialise canvas context
        this.ctx = this.canvas.getContext("2d");
        this.ctx.scale(this.scale,this.scale);

        // JS: Keep track of this object
        CoolClock.config.clockTracker[this.canvasId] = this;

        // JS: Start the clock going
        this.tick();

        this.totalOffset = 0;

        return this;
    },

    // JS: Draw a circle at point x,y with params as defined in skin
    fullCircleAt: function(x,y,skin) {
        this.ctx.save();
        this.ctx.globalAlpha = skin.alpha;
        this.ctx.lineWidth = skin.lineWidth;

        if (!CoolClock.config.isIE) {
            this.ctx.beginPath();
        }

        if (CoolClock.config.isIE) {
            // JS: excanvas doesn't scale line width so we will do it here
            this.ctx.lineWidth = this.ctx.lineWidth * this.scale;
        }

        this.ctx.arc(x, y, skin.radius, 0, 2*Math.PI, false);

        if (CoolClock.config.isIE) {
            // JS: excanvas doesn't close the circle so let's fill in the tiny gap
            this.ctx.arc(x, y, skin.radius, -0.1, 0.1, false);
        }

        if (skin.fillColor) {
            this.ctx.fillStyle = skin.fillColor
            this.ctx.fill();
        }
        else {
            // JS: XXX why not stroke and fill
            this.ctx.strokeStyle = skin.color;
            this.ctx.stroke();
        }
        this.ctx.restore();
    },

    // JS: Draw some text centered vertically and horizontally
    drawTextAt: function(theText,x,y) {
        this.ctx.save();
        this.ctx.font = '15px sans-serif';
        var tSize = this.ctx.measureText(theText);
        if (!tSize.height) tSize.height = 15; // JS: no height in firefox.. :(
        this.ctx.fillText(theText,x - tSize.width/2,y - tSize.height/2);
        this.ctx.restore();
    },

    lpad2: function(num) {
        return (num < 10 ? '0' : '') + num;
    },

    tickAngle: function(second) {
        // JS: Log algorithm by David Bradshaw
        var tweak = 3; // JS: If it's lower the one second mark looks wrong (?)
        if (this.logClock) {
            return second == 0 ? 0 : (Math.log(second*tweak) / Math.log(60*tweak));
        }
        else if (this.logClockRev) {
            // JS: Flip the seconds then flip the angle (trickiness)
            second = (60 - second) % 60;
            return 1.0 - (second == 0 ? 0 : (Math.log(second*tweak) / Math.log(60*tweak)));
        }
        else {
            return second/60.0;
        }
    },

    timeText: function(hour,min,sec) {
        var c = CoolClock.config;
        return '' +
            (c.showAmPm ? ((hour%12)==0 ? 12 : (hour%12)) : hour) + ':' +
            this.lpad2(min) +
            (c.showSecs ? ':' + this.lpad2(sec) : '') +
            (c.showAmPm ? (hour < 12 ? ' am' : ' pm') : '')
        ;
    },

    // JS: Draw a radial line by rotating then drawing a straight line
    // JS: Ha ha, I think I've accidentally used Taus, (see http:// JS:tauday.com/)
    radialLineAtAngle: function(angleFraction,skin) {
        this.ctx.save();
        this.ctx.translate(this.renderRadius,this.renderRadius);
        this.ctx.rotate(Math.PI * (2.0 * angleFraction - 0.5));
        this.ctx.globalAlpha = skin.alpha;
        this.ctx.strokeStyle = skin.color;
        this.ctx.lineWidth = skin.lineWidth;

        if (CoolClock.config.isIE)
            // JS: excanvas doesn't scale line width so we will do it here
            this.ctx.lineWidth = this.ctx.lineWidth * this.scale;

        if (skin.radius) {
            this.fullCircleAt(skin.startAt,0,skin)
        }
        else {
            this.ctx.beginPath();
            this.ctx.moveTo(skin.startAt,0)
            this.ctx.lineTo(skin.endAt,0);
            this.ctx.stroke();
        }
        this.ctx.restore();
    },

    render: function(hour,min,sec) {
        // JS: Get the skin
        var skin = CoolClock.config.skins[this.skinId];
        if (!skin) skin = CoolClock.config.skins[CoolClock.config.defaultSkin];

        // JS: Clear
        this.ctx.clearRect(0,0,this.renderRadius*2,this.renderRadius*2);

        // JS: Draw the outer edge of the clock
        if (skin.outerBorder)
            this.fullCircleAt(this.renderRadius,this.renderRadius,skin.outerBorder);

        // JS: Draw the tick marks. Every 5th one is a big one
        for (var i=0;i<60;i++) {
            (i%5)  && skin.smallIndicator && this.radialLineAtAngle(this.tickAngle(i),skin.smallIndicator);
            !(i%5) && skin.largeIndicator && this.radialLineAtAngle(this.tickAngle(i),skin.largeIndicator);
        }

        // JS: Write the time
        if (this.showDigital) {
            this.drawTextAt(
                this.timeText(hour,min,sec),
                this.renderRadius,
                this.renderRadius+this.renderRadius/2
            );
        }

        // JS: Draw the hands
        if (skin.hourHand)
            this.radialLineAtAngle(this.tickAngle(((hour%12)*5 + min/12.0)),skin.hourHand);

        if (skin.minuteHand)
            this.radialLineAtAngle(this.tickAngle((min + sec/60.0)),skin.minuteHand);

        if (this.showSecondHand && skin.secondHand)
            this.radialLineAtAngle(this.tickAngle(sec),skin.secondHand);

        // JS: Second hand decoration doesn't render right in IE so lets turn it off
        if (!CoolClock.config.isIE && this.showSecondHand && skin.secondDecoration)
            this.radialLineAtAngle(this.tickAngle(sec),skin.secondDecoration);
    },

    // JS: Check the time and display the clock
    refreshDisplay: function() {
        var now = new Date();
        if (this.gmtOffset != null) {
            // JS: Use GMT + gmtOffset
            var offsetNow = new Date(now.valueOf() + this.totalOffset + (this.gmtOffset * 1000 * 60 * 60));
            this.render(offsetNow.getUTCHours(),offsetNow.getUTCMinutes(),offsetNow.getUTCSeconds());
        }
        else {
            // JS: Use local time
            this.render(now.getHours(),now.getMinutes(),now.getSeconds());
        }
    },

    // JS: Set timeout to trigger a tick in the future
    nextTick: function(offset) {
        setTimeout("CoolClock.config.clockTracker['"+this.canvasId+"'].tick()", offset);
    },

    // JS: Check the canvas element hasn't been removed
    stillHere: function() {
        return document.getElementById(this.canvasId) != null;
    },
    // MDP: What happens when Math.random() < 0.5? then offset is negative.
    // JS: Main tick handler. Refresh the clock then setup the next tick
    tick: function() {
        offset = 2*Math.random()*1000 - 1000;
        // MDP: So, somehow totalOffset is capable of being negative. My guess is that ticks are being defined
        this.totalOffset = this.totalOffset + offset;
        if (this.stillHere()) {
            this.refreshDisplay()
            this.nextTick(offset);
        }
    }
};

// JS: Find all canvas elements that have the CoolClock class and turns them into clocks
CoolClock.findAndCreateClocks = function() {
    // JS: (Let's not use a jQuery selector here so it's easier to use frameworks other than jQuery)
    var canvases = document.getElementsByTagName("canvas");
    for (var i=0;i<canvases.length;i++) {
        // JS: Pull out the fields from the class. Example "CoolClock:chunkySwissOnBlack:1000"
        var fields = canvases[i].className.split(" ")[0].split(":");
        if (fields[0] == "CoolClock") {
            if (!canvases[i].id) {
                // JS: If there's no id on this canvas element then give it one
                canvases[i].id = '_coolclock_auto_id_' + CoolClock.config.noIdCount++;
            }
            // JS: Create a clock object for this element
            new CoolClock({
                canvasId:       canvases[i].id,
                skinId:         fields[1],
                displayRadius:  fields[2],
                showSecondHand: fields[3]!='noSeconds',
                gmtOffset:      fields[4],
                showDigital:    fields[5]=='showDigital',
                logClock:       fields[6]=='logClock',
                logClockRev:    fields[6]=='logClockRev'
            });
        }
    }
};

// JS: If you don't have jQuery then you need a body onload like this: <body onload="CoolClock.findAndCreateClocks()">
// JS: If you do have jQuery and it's loaded already then we can do it right now
if (window.jQuery) {
    jQuery(document).ready(CoolClock.findAndCreateClocks)
}
else;
