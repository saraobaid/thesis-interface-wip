/**
 * jspsych-single-image
 * Kyoung whan Choe (https://github.com/kywch/)
 *
 * jspsych plugin for showing images
 * 
 **/

jsPsych.plugins['single-image'] = (function () {

    jsPsych.pluginAPI.registerPreload('single-image', 'stimulus', 'image');

    var plugin = {};

    plugin.info = {
        name: 'single-image',
        description: '',
        parameters: {
            prompt: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Prompt',
                description: 'Description of what participants should do here'
            },
            stimulus: { // should be an image
                type: jsPsych.plugins.parameterType.IMAGE,
                pretty_name: 'Stimulus image',
                default: undefined,
                description: 'The image to present'
            },
            image_size: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Image size',
                array: true,
                default: [800, 600],
                description: 'Array specifying the width and height of image presentation in pixels'
            },
            stimulus_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Stimulus duration',
                default: 2000,
                description: 'How long to show the image for in milliseconds'
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

        // if prompt is set, show prompt
        if (trial.prompt !== null) {
            display_element.innerHTML = trial.prompt;
        }

        display_element.innerHTML = '<img id="jspsych-single-image" width="' + trial.image_size[0] + '" '
            + 'height="' + trial.image_size[1] + '" src="' + trial.stimulus + '"></img>';

        // hide image after time if the timing parameter is set
        if (trial.stimulus_duration == null || trial.stimulus_duration < 0) {
            alert('ERROR: stimulus_duration must be set!');
            return;
        } else {
            jsPsych.pluginAPI.setTimeout(function () {
                endTrial();
            }, trial.stimulus_duration);
        }

        trial_onset = performance.now();

        function endTrial() {
            display_element.innerHTML = '';
            var image_name = trial.stimulus.substring(trial.stimulus.lastIndexOf('/') + 1);
            var trial_data = {
                "fullscreen_reset": reset_fullscreen,
                "image": image_name, // just the image name
                "stimulus_duration": Math.round(performance.now() - trial_onset)
            };
            if (flag_debug) {
                console.log(trial_data);
            }
            // kill any remaining setTimeout handlers
            jsPsych.pluginAPI.clearAllTimeouts();
            jsPsych.finishTrial(trial_data);
        }
    };

    return plugin;
})();