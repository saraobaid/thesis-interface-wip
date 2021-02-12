/**
 * jspsych-bubble-view
 * Kyoung Whan Choe (https://github.com/kywch/)
 *
 * jspsych plugin for showing images with bubble view
 * 
 * For the bubble view paper, see http://bubbleview.namwkim.org/
 * For the original bubble view code, see https://github.com/namwkim/bubbleview 
 *
 **/

jsPsych.plugins['bubble-view'] = (function () {

    jsPsych.pluginAPI.registerPreload('bubble-view', 'org_image', 'image');
    jsPsych.pluginAPI.registerPreload('bubble-view', 'blur_image', 'image');

    var plugin = {};
    var last_click = 0;
    var trial_onset = 0;
    var bubbles_left = Infinity;

    plugin.info = {
        name: 'bubble-view',
        description: '',
        parameters: {
            prompt: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Prompt',
                description: 'Description of what participants should do here'
            },
            org_image: {
                type: jsPsych.plugins.parameterType.IMAGE,
                pretty_name: 'Original image',
                default: undefined,
                description: 'An image to uncover'
            },
            blur_image: {
                type: jsPsych.plugins.parameterType.IMAGE,
                pretty_name: 'Original image',
                default: undefined,
                description: 'An image to uncover'
            },
            image_size: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Image size',
                array: true,
                default: [800, 600],
                description: 'Array specifying the width and height of image presentation in pixels'
            },
            bubble_radius: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Bubble radius',
                default: 50,
                description: 'The radius of the bubble in pixels'
            },
            trial_type: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Trial type',
                default: 'fixed_viewing_duration', // 'fixed_click_maximum',
                description: 'The condition to proceed: either fixed number of clicks or fixed duration'
            },
            viewing_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Viewing duration',
                default: 5000,
                description: 'How long to show the image for in milliseconds'
            },
            maximum_click: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Maximum clicks',
                default: 6,
                description: 'The number of clicks/bubbles one can make in a trial'
            },
            minimum_click: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Minimum clicks',
                default: 3,
                description: 'One can proceed after this number of clicks/bubbles'
            },
            refractory_period: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Refractory period',
                default: 500,
                description: 'Refractory period after each click in milliseconds'
            }
        }
    }

    plugin.trial = function (display_element, trial) {

        // make sure that it is using the fullscreen mode
        var element = document.documentElement;
        var reset_fullscreen = false;
        if (element.requestFullscreen) {
            element.requestFullscreen();
            reset_fullscreen = true;
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
            reset_fullscreen = true;
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
            reset_fullscreen = true;
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
            reset_fullscreen = true;
        }

        last_click = 0;
        if (trial.trial_type == "fixed_click_maximum") {
            bubbles_left = trial.maximum_click;
        }
        var bubble_history = [];
        if (trial.maximum_click < trial.minimum_click) { // well, this can happen
            trial.minimum_click = trial.maximum_click;
        }

        function clickLogger(evt) {
            bubble_history.push({
                "time": evt.time,
                "cx": evt.cx,
                "cy": evt.cy
            });
            if (flag_debug) {
                console.log("Bubble click time, x, y = " + evt.time + ", " + evt.cx + ", " + evt.cy);
                console.log(bubble_history);
            }
            // if the trial finished after reaching the click # threshold
            if (trial.trial_type == "fixed_click_maximum") {
                if (bubble_history.length === trial.minimum_click) {
                    document.querySelector("#jspsych-bubble-view-submit").insertAdjacentHTML('afterBegin',
                        '<button id="jspsych-bubble-view-next" class="jspsych-btn">Next</button>');
                    display_element.querySelector('#jspsych-bubble-view-next').addEventListener('click', endTrial);
                }
            }
        }

        // if prompt is set, show prompt
        if (trial.prompt !== null) {
            display_element.innerHTML = trial.prompt;
        }

        display_element.innerHTML += '<canvas id="jspsych-bubble-view" width="' + trial.image_size[0] +
            '" height="' + trial.image_size[1] + '"></canvas>';
        if (trial.trial_type == "fixed_click_maximum") {
            display_element.innerHTML += '<br><span id="jspsych-bubbles-left"></span> bubbles left.';
            display_element.innerHTML += '<br><div id="jspsych-bubble-view-submit" style="height:100px;"></div>';
            jQuery("#jspsych-bubbles-left").text(bubbles_left.toString());
        }

        plugin.setup_bubble(trial.org_image, trial.blur_image, 'jspsych-bubble-view',
            trial.bubble_radius, trial.refractory_period, clickLogger);

        trial_onset = performance.now();

        // hide image after time if the timing parameter is set
        if (trial.trial_type == "fixed_viewing_duration") {
            jsPsych.pluginAPI.setTimeout(function () {
                endTrial();
            }, trial.viewing_duration);
        }

        // activate the mouse tracking
        var mouse_track = [];

        function record_mousepos(e) {
            var width_cnt = window.innerWidth / 2;
            var height_cnt = window.innerHeight / 2;
            var curr_smp = [Math.round(performance.now() - trial_onset), (e.pageX - width_cnt), (e.pageY - height_cnt), 0];
            if (flag_debug) {
                //console.log("mouse: ", curr_smp);
            }
            mouse_track.push(curr_smp);
        }

        function record_mousedown(e) {
            var width_cnt = window.innerWidth / 2;
            var height_cnt = window.innerHeight / 2;
            var curr_smp = [Math.round(performance.now() - trial_onset), (e.pageX - width_cnt), (e.pageY - height_cnt), 1];
            if (flag_debug) {
                //console.log("mouse: ", curr_smp);
            }
            mouse_track.push(curr_smp);
        }
        jQuery(document).mousemove(record_mousepos);
        jQuery(document).mousedown(record_mousedown);

        function endTrial() {
            display_element.innerHTML = '';
            var image_name = trial.org_image.substring(trial.org_image.lastIndexOf('/') + 1);
            var trial_data = {
                "fullscreen_reset": reset_fullscreen,
                "image": image_name, // just the image name
                "image_size": trial.image_size,
                "bubble_radius": trial.bubble_radius,
                "trial_type": trial.trial_type,
                "bubble_history": bubble_history,
                "viewing_duration": Math.round(performance.now() - trial_onset),
                "mouse_track": mouse_track
            };
            if (flag_debug) {
                console.log(trial_data);
            }
            // removing event handlers
            jQuery(document).off("mousemove", record_mousepos);
            jQuery(document).off("mousedown", record_mousedown);

            // kill any remaining setTimeout handlers
            jsPsych.pluginAPI.clearAllTimeouts();
            jsPsych.finishTrial(trial_data);
        }
    };

    plugin.setup_bubble = function (orgImgSrc, blurImgSrc, canvasId, bubbleSize, clickRefractory, clickFunc = null) {

        var canvas = document.getElementById(canvasId);
        var imgBlur = new Image();
        var imgOrg = new Image();
        var bubbleR = parseInt(bubbleSize);
        if (isNaN(bubbleR) || bubbleR <= 0) {
            return;
        }

        function CalcNewImageSize(imgWidth, imgHeight, canvasWidth, canvasHeight) {
            var ratio = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight); //Math.min(, 1.0);
            if (ratio > 1.0) {
                ratio = 1.0;
            }
            return {
                width: imgWidth * ratio,
                height: imgHeight * ratio
            };
        }

        function OnClickDrawMask(e) {
            var clickTime = performance.now() - trial_onset;
            var clickInterval = clickTime - last_click;

            // if a click occured within the refractory period, just ignore that
            if ((clickInterval > clickRefractory) & (bubbles_left > 0)) {
                last_click = clickTime;
                var ctx = canvas.getContext('2d');
                ctx.save();
                var rect = canvas.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;

                //reset previous cicle
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                var newSize = CalcNewImageSize(imgBlur.naturalWidth, imgBlur.naturalHeight, canvas.width, canvas.height);
                ctx.drawImage(imgBlur, 0, 0, newSize.width, newSize.height);

                //draw the circle
                ctx.beginPath();
                ctx.arc(x, y, bubbleR, 0, 6.28, false);
                ctx.clip();
                ctx.drawImage(imgOrg, 0, 0, newSize.width, newSize.height);
                ctx.arc(x, y, bubbleR, 0, 2 * Math.PI, false);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ff0000';
                ctx.stroke();
                ctx.restore();
                ctx.restore();

                bubbles_left -= 1;
                jQuery("#jspsych-bubbles-left").text(bubbles_left.toString());

                // pass the data to passed click function
                if (clickFunc) {
                    clickFunc.call(e, {
                        time: Math.round(clickTime),
                        cx: Math.round(x),
                        cy: Math.round(y)
                    });
                }
            } else {
                if (flag_debug) {
                    console.log("Click refractory period: ", Math.round(clickInterval));
                }
            }
        }

        imgBlur.onload = function () {
            canvas.removeEventListener('click', OnClickDrawMask);
            canvas.addEventListener('click', OnClickDrawMask);

            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var newSize = CalcNewImageSize(this.naturalWidth, this.naturalHeight, canvas.width, canvas.height);

            ctx.drawImage(imgBlur, 0, 0, newSize.width, newSize.height);
        }

        imgBlur.src = blurImgSrc;
        imgOrg.src = orgImgSrc;

    };

    return plugin;
})();