/**
 * bubble-view_main.js
 * Kyoung Whan Choe (https://github.com/kywch/)
 *
 * main javascript for showing images with bubble view
 * 
 * For the bubble view paper, see http://bubbleview.namwkim.org/
 * For the original bubble view code, see https://github.com/namwkim/bubbleview 
 * 
 **/

/*
 * Generic task variables
 */
var sbj_id = ""; // mturk id
var task_id = ""; // the prefix for the save file -- the main seq
var data_dir = "";

var maximum_click = 10;
var flag_debug = false;
var flag_save = false;
if (flag_debug) {
    var trial_dur = 1000;
} else {
    var trial_dur = 4000;
}

var image_history = [];
var viewrt_history = [];
var rating_history = [];
var descrt_history = [];
var desc_content = [];

// a single result string will be generated for saving to qualtrics
var result_string = 'trial image_name event_type time_from_onset x_loc y_loc;';

// activity tracking
var focus = 'focus'; // tracks if the current tab/window is the active tab/window, initially the current tab should be focused
var fullscr_ON = 'no'; // tracks fullscreen activity, initially not activated
var fullscr_history = [];


/*
 * Helper functions
 */

// YOU MUST GET YOUR OWN DROPBOX ACCESS TOKEN for uploading the file to your dropbox
// from https://dropbox.github.io/dropbox-api-v2-explorer/#files_upload
var dropbox_access_token = '';
var save_filename = '/' + task_id + '_' + sbj_id + '.json';

function save_data() {
    // if you prefer json-format, use jsPsych.data.get().json()
    // if you prefer csv-format, use jsPsych.data.get().csv()
    if (flag_debug) {
        console.log("Save data function called.");
        //console.log(jsPsych.data.get().json());
    }
    try {
        if (flag_save) {
            var dbx = new Dropbox.Dropbox({
                fetch: fetch,
                accessToken: dropbox_access_token
            });
            dbx.filesUpload({
                    path: save_filename,
                    mode: 'overwrite',
                    mute: true,
                    contents: jsPsych.data.get().json()
                })
                .then(function (response) {
                    if (flag_debug) {
                        console.log(response);
                    }
                })
                .catch(function (error) {
                    console.error(error);
                });
        }
    } catch (err) {
        console.log("Save data function failed.", err);
    }
}


/*
 * Practice block
 */
function generate_practice_block(prac_img_src, prac_blur_src, prac_seq, 
    img_ext, img_attn = [], rating_prompt, rating_buttons, bubble_radius = 70) {

    var block_sequence = [];
    var num_trial = prac_seq.length;

    var practice_instructions_page = {
        type: 'instructions',
        pages: [
            '<div class = centerbox><p class = block-text>Click next to begin the practice trials.</p></div>'
        ],
        allow_keys: false,
        show_clickable_nav: true,
        allow_backward: false,
        show_page_number: false,
        data: {
            exp_stage: 'practice_instructions',
            sbj_id: sbj_id
        }
    };
    block_sequence.push(practice_instructions_page);

    for (var ii = 0; ii < num_trial; ii++) {
        var start_trial = {
            type: 'instructions',
            pages: [
                '<p class = block-text>' +
                'Click next to begin the practice trial ' + (ii + 1).toString() + '/' + num_trial.toString() + '.</p></div>'
            ],
            allow_keys: false,
            show_clickable_nav: true,
            allow_backward: false,
            show_page_number: false,
            data: {
                exp_stage: 'practice_trial_start_' + (ii + 1).toString(),
            }
        };
        block_sequence.push(start_trial);

        /*
        var gist_phase = {
            type: 'single-image',
            stimulus: prac_blur_src + prac_seq[ii] + '.' + img_ext, // blurry image
            image_size: [800, 450],
            stimulus_duration: 2000,
            data: {
                exp_stage: 'practice_trial_gist_' + (ii + 1).toString()
            }
        };
        block_sequence.push(gist_phase);

        var rating_gist_phase = {
            type: 'html-button-response',
            stimulus: '<p class = block-text>' +
                'Please rate how violent the picture was (1:none - 7:extremely).</p>',
            choices: ['1', '2', '3', '4', '5', '6', '7'],
            data: {
                exp_stage: 'practice_trial_rate_gist' + (ii + 1).toString()
            }
        };
        block_sequence.push(rating_gist_phase);
        */

        var bubble_phase = {
            type: 'bubble-view',
            org_image: prac_img_src + prac_seq[ii] + '.' + img_ext,
            blur_image: prac_blur_src + prac_seq[ii] + '.' + img_ext,
            prompt: '<p class = block-text>Please inspect the image using up to <b>' + maximum_click + '</font></b> bubbles.</p>',
            trial_type: 'fixed_click_maximum', // or 'fixed_viewing_duration'
            maximum_click: maximum_click,
            bubble_radius: bubble_radius,
            image_size: [800, 450],
            data: {
                exp_stage: 'practice_trial_bubble_' + (ii + 1).toString()
            }
        };
        block_sequence.push(bubble_phase);

        var rating_bubble_phase = {
            type: 'html-button-response',
            stimulus: '<p class = block-text>' + rating_prompt + '</p>',
            choices: rating_buttons,
            data: {
                exp_stage: 'practice_trial_rate_bubble' + (ii + 1).toString(),
                image: prac_seq[ii]
            }
        };
        block_sequence.push(rating_bubble_phase);

        // ATTN CHECK: we are only asking people to provide description of a scene, when its name is in img_attn
        if (img_attn.indexOf(prac_seq[ii]) > -1) {
            var describe_phase = {
                type: 'survey-text',
                questions: [{
                    prompt: '<p class = block-text>Please describe the interaction that you saw<br>(minimum 30 characters).</p>',
                    rows: 4,
                    columns: 50
                }],
                minimum_duration: trial_dur,
                required_character: 23,
                data: {
                    exp_stage: 'practice_trial_describe_' + (ii + 1).toString(),
                    image: prac_seq[ii]
                }
            };
            block_sequence.push(describe_phase);
        }

    }

    return block_sequence;

}


/*
 * Main block
 */
function generate_main_block(main_img_src, main_blur_src, main_seq,
    img_ext, img_attn = [], rating_prompt, rating_buttons, bubble_radius = 70) {

    image_history = [...main_seq];

    var block_sequence = [];
    var num_trial = main_seq.length;

    var main_instructions_page = {
        type: 'instructions',
        pages: [
            '<div class = centerbox><p class = block-text>You finshed the practice and are about to begin the main task.</p>' +
            '<p class = block-text>Please take the study seriously.</p>' +
            '<p class = block-text>Again, we very much appreciate your participation!</p></div>',
            '<div class = centerbox><p class = block-text>Click next to continue.</p>'
        ],
        allow_keys: false,
        show_clickable_nav: true,
        allow_backward: false,
        show_page_number: false,
        data: {
            exp_stage: 'main_instructions',
            sbj_id: sbj_id
        },
        on_finish: function (data) {
            save_data();
        }
    };
    block_sequence.push(main_instructions_page);

    for (var ii = 0; ii < num_trial; ii++) {
        var start_trial = {
            type: 'instructions',
            pages: [
                '<p class = block-text>' +
                'Click next to begin the trial ' + (ii + 1).toString() + '/' + num_trial.toString() + '.</p></div>'
            ],
            allow_keys: false,
            show_clickable_nav: true,
            allow_backward: false,
            show_page_number: false,
            data: {
                exp_stage: 'main_trial_start_' + (ii + 1).toString(),
            }
        };
        block_sequence.push(start_trial);


        /*
        var gist_phase = {
            type: 'single-image',
            stimulus: main_blur_src + main_seq[ii] + '.' + img_ext, // blurry image
            image_size: [800, 450],
            stimulus_duration: 2000,
            data: {
                exp_stage: 'main_trial_gist_' + (ii + 1).toString()
            }
        };
        block_sequence.push(gist_phase);

        var rating_gist_phase = {
            type: 'html-button-response',
            stimulus: '<p class = block-text>' +
                'Please rate how violent the picture was (1:none - 7:extremely).</p>',
            choices: ['1', '2', '3', '4', '5', '6', '7'],
            data: {
                exp_stage: 'main_trial_rate_gist' + (ii + 1).toString()
            }
        };
        block_sequence.push(rating_gist_phase);
        */

        var bubble_phase = {
            type: 'bubble-view',
            org_image: main_img_src + main_seq[ii] + '.' + img_ext,
            blur_image: main_blur_src + main_seq[ii] + '.' + img_ext,
            prompt: '<p class = block-text>Please inspect the image using up to <b>' + maximum_click + '</font></b> bubbles.</p>',
            trial_type: 'fixed_click_maximum', // or 'fixed_viewing_duration'
            maximum_click: maximum_click,
            bubble_radius: bubble_radius,
            image_size: [800, 450],
            data: {
                exp_stage: 'main_trial_bubble_' + (ii + 1).toString()
            },
            on_finish: function (data) {
                viewrt_history.push(data.viewing_duration);
                // csv-like string: delimiter - space (' '), newline - semicolon (';')
                // results_string = 'trial image_name event_type time_from_onset x_loc y_loc;';
                result_string += viewrt_history.length.toString() + ' ' + // trial
                    image_history[viewrt_history.length - 1] + ' ' + // image_name
                    'size ' + // event_type
                    'NaN ' + // time_from_onset
                    data.image_size[0].toString() + ' ' + // x_loc
                    data.image_size[1].toString() + ';'; // y_loc
                for (var ij = 0; ij < data.bubble_history.length; ij++) {
                    result_string += viewrt_history.length.toString() + ' ' + // trial
                        image_history[viewrt_history.length - 1] + ' ' + // image_name
                        'bubble ' + // event_type
                        data.bubble_history[ij]['time'] + ' ' + // time_from_onset
                        data.bubble_history[ij]['cx'] + ' ' + // x_loc
                        data.bubble_history[ij]['cy'] + ';'; // x_loc
                }
                result_string += viewrt_history.length.toString() + ' ' + // trial
                    image_history[viewrt_history.length - 1] + ' ' + // image_name
                    'submit ' + // event_type
                    data.viewing_duration + ' ' + // time_from_onset
                    'NaN ' + // x_loc
                    'NaN;'; // x_loc
            }
        };
        block_sequence.push(bubble_phase);

        var rating_bubble_phase = {
            type: 'html-button-response',
            stimulus: '<p class = block-text>' + rating_prompt + '</p>',
            choices: rating_buttons,
            data: {
                exp_stage: 'main_trial_rate_bubble_' + (ii + 1).toString(),
                image: main_seq[ii]
            },
            on_finish: function (data) {
                rating_history.push(rating_buttons[parseInt(data.button_pressed)]);
            }
        };
        block_sequence.push(rating_bubble_phase);

        // ATTN CHECK: we are only asking people to provide description of a scene, when its name is in img_attn
        if (img_attn.indexOf(main_seq[ii]) > -1) {
            var describe_phase = {
                type: 'survey-text',
                questions: [{
                    prompt: '<p class = block-text>Please describe the interaction that you saw<br>(minimum 40 characters).</p>',
                    rows: 5,
                    columns: 50
                }],
                minimum_duration: trial_dur,
                required_character: 30,
                data: {
                    exp_stage: 'main_trial_describe_' + (ii + 1).toString(),
                    image: main_seq[ii]
                },
                on_finish: function (data) {
                    descrt_history.push(Math.round(data.rt));
                    let text = JSON.parse(data.responses);
                    desc_content.push(image_history[viewrt_history.length - 1] + ' ' + text['Q0']);
                }
            };
            block_sequence.push(describe_phase);
        }

        if (ii % 15 == 14) {
            var break_page = {
                type: 'instructions',
                pages: [
                    '<div class = centerbox><p class = block-text>You can take a short break. Click next to continue.</p>'
                ],
                allow_keys: false,
                show_clickable_nav: true,
                allow_backward: false,
                show_page_number: false,
                data: {
                    exp_stage: 'main_break'
                },
                on_finish: function (data) {
                    save_data();
                }
            };
            block_sequence.push(break_page);
        }

    }

    return block_sequence;

}