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
var sbj_id = jsPsych.randomization.randomID(6); // mturk id
var task_id = ""; // the prefix for the save file -- the main seq
var data_dir = "";

var maximum_click = 10;
var flag_debug = true;
var flag_save = true;
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
var result_string = "trial image_name event_type time_from_onset x_loc y_loc;";

// activity tracking
var focus = "focus"; // tracks if the current tab/window is the active tab/window, initially the current tab should be focused
var fullscr_ON = "no"; // tracks fullscreen activity, initially not activated
var fullscr_history = [];

/*
 * Helper functions
 */

// YOU MUST GET YOUR OWN DROPBOX ACCESS TOKEN for uploading the file to your dropbox
// from https://dropbox.github.io/dropbox-api-v2-explorer/#files_upload
var dropbox_access_token =
  "KQyGHv36u2EAAAAAAAAAAU-2_MkvOFrpL2vCOK55E-G_k9UBlzL5KRVPCqajf3Q8";
var save_filename = "/" + task_id + "_" + sbj_id + ".json";

function save_data() {
  // if you prefer json-format, use jsPsych.data.get().json()
  // if you prefer csv-format, use jsPsych.data.get().csv()
  if (flag_debug) {
    console.log("Save data function called.");
    console.log(jsPsych.data.get().json());
  }
  try {
    if (flag_save) {
      var dbx = new Dropbox.Dropbox({
        // fetch: fetch,
        accessToken: dropbox_access_token,
      });
      dbx
        .filesUpload({
          path: save_filename,
          mode: "overwrite",
          mute: true,
          contents: jsPsych.data.get().json(),
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
function generate_practice_block(
  prac_img_src,
  prac_blur_src,
  prac_seq,
  img_ext,
  rating_prompt,
  rating_buttons,
  bubble_radius = 70
) {
  var block_sequence = [];
  var num_trial = prac_seq.length;

  var practice_id_entry = {
    type: "survey-html-form",
    preamble: "<div><p>Enter your Prolific ID:</p> </div >",
    html: '<p><input id="id_box" name="proli_id" type="text" /></p>',
    autofocus: "id_box",
    // allow_keys: true,
    // show_clickable_nav: true,
    // allow_backward: false,
    // show_page_number: false,
    data: {
      exp_stage: "practice_id_entry",
      sbj_id: sbj_id,
    },
  };
  block_sequence.push(practice_id_entry);

  for (var ii = 0; ii < num_trial; ii++) {
    var start_trial = {
      type: "instructions",
      pages: [
        "<p class = block-text>" +
          "Click next to begin the practice trial " +
          (ii + 1).toString() +
          "/" +
          num_trial.toString() +
          ".</p></div>",
      ],
      allow_keys: false,
      show_clickable_nav: true,
      allow_backward: false,
      show_page_number: false,
      data: {
        exp_stage: "practice_trial_start_" + (ii + 1).toString(),
        sbj_id: sbj_id,
      },
    };
    block_sequence.push(start_trial);

    var bubble_phase = {
      type: "bubble-view",
      org_image: prac_img_src + prac_seq[ii] + "." + img_ext,
      blur_image: prac_blur_src + prac_seq[ii] + "." + img_ext,
      prompt:
        "<div class = block-text><p class = center-block-text>How untruthful/truthful is the information in this post?</p> <p class = understate>  Click 3-" +
        maximum_click +
        "</font></b> times, then press Next to make your rating.</p>",
      trial_type: "fixed_click_maximum", // or 'fixed_viewing_duration'
      maximum_click: maximum_click,
      bubble_radius: bubble_radius,
      image_size: [800, 450],
      data: {
        exp_stage: "practice_trial_bubble_" + (ii + 1).toString(),
      },
    };
    block_sequence.push(bubble_phase);

    // var rating_bubble_phase = {
    //   type: "html-button-response",
    //   stimulus: "<p class = block-text>" + rating_prompt + "</p>",
    //   choices: rating_buttons,
    //   data: {
    //     exp_stage: "practice_trial_rate_bubble" + (ii + 1).toString(),
    //     image: prac_seq[ii],
    //   },
    // };

    var rating_bubble_phase = {
      type: "html-slider-response",
      stimulus: "<p class = center-block-text>" + rating_prompt + "</p>",
      labels: rating_buttons,
      data: {
        exp_stage: "practice_trial_rate_bubble" + (ii + 1).toString(),
        image: prac_seq[ii],
      },
    };
    block_sequence.push(rating_bubble_phase);
  }

  return block_sequence;
}

/*
 * Main block
 */
function generate_main_block(
  main_img_src,
  main_blur_src,
  main_seq,
  img_ext,
  rating_prompt,
  rating_buttons,
  bubble_radius = 70
) {
  image_history = [...main_seq];

  var block_sequence = [];
  var num_trial = main_seq.length;

  var main_instructions_page = {
    type: "instructions",
    pages: [
      "<div class = centerbox ><p class = center-block-text >You finished the practice and are about to begin the main task. " +
        "Please take the study seriously. " +
        "Again, we very much appreciate your participation!</p>" +
        "<p class = callout>In a previous study, approximately 75% of politically conservative participants who viewed the following post found that it contains false information.</p></div>",
    ],
    allow_keys: false,
    show_clickable_nav: true,
    allow_backward: false,
    show_page_number: false,
    data: {
      exp_stage: "main_instructions",
      sbj_id: sbj_id,
    },
    // on_finish: function (data) {
    //   save_data();
    // },
  };
  // block_sequence.push(main_instructions_page);

  for (var ii = 0; ii < num_trial; ii++) {
    var start_trial = {
      type: "instructions",
      pages: [
        "<div class = centerbox ><p class = center-block-text >You finished the practice and are about to begin the main task. " +
          "Please take the study seriously. " +
          "Again, we very much appreciate your participation!</p>" +
          "<p class = callout>In a previous study, approximately 75% of politically conservative participants who viewed the following post found that it contains false information.</p></div>" +
          "<p class = block-text>" +
          "Click next to begin the trial " +
          (ii + 1).toString() +
          "/" +
          num_trial.toString() +
          ".</p></div>",
      ],
      allow_keys: false,
      show_clickable_nav: true,
      allow_backward: false,
      show_page_number: false,
      data: {
        exp_stage: "main_trial_start_" + (ii + 1).toString(),
        sbj_id: sbj_id,
      },
    };
    block_sequence.push(start_trial);

    var bubble_phase = {
      type: "bubble-view",
      org_image: main_img_src + main_seq[ii] + "." + img_ext,
      blur_image: main_blur_src + main_seq[ii] + "." + img_ext,
      prompt:
        "<div class = block-text><p class = center-block-text>How untruthful/truthful is the information in this post?</p> <p class = understate>  Click 3-" +
        maximum_click +
        "</font></b> times, then press Next to make your rating.</p>",
      trial_type: "fixed_click_maximum", // or 'fixed_viewing_duration'
      maximum_click: maximum_click,
      bubble_radius: bubble_radius,
      image_size: [800, 450],
      data: {
        exp_stage: "main_trial_bubble_" + (ii + 1).toString(),
      },
      on_finish: function (data) {
        viewrt_history.push(data.viewing_duration);
        // csv-like string: delimiter - space (' '), newline - semicolon (';')
        // results_string = 'trial image_name event_type time_from_onset x_loc y_loc;';
        result_string +=
          viewrt_history.length.toString() +
          " " + // trial
          image_history[viewrt_history.length - 1] +
          " " + // image_name
          "size " + // event_type
          "NaN " + // time_from_onset
          data.image_size[0].toString() +
          " " + // x_loc
          data.image_size[1].toString() +
          ";"; // y_loc
        for (var ij = 0; ij < data.bubble_history.length; ij++) {
          result_string +=
            viewrt_history.length.toString() +
            " " + // trial
            image_history[viewrt_history.length - 1] +
            " " + // image_name
            "bubble " + // event_type
            data.bubble_history[ij]["time"] +
            " " + // time_from_onset
            data.bubble_history[ij]["cx"] +
            " " + // x_loc
            data.bubble_history[ij]["cy"] +
            ";"; // x_loc
        }
        result_string +=
          viewrt_history.length.toString() +
          " " + // trial
          image_history[viewrt_history.length - 1] +
          " " + // image_name
          "submit " + // event_type
          data.viewing_duration +
          " " + // time_from_onset
          "NaN " + // x_loc
          "NaN;"; // x_loc
      },
    };
    block_sequence.push(bubble_phase);

    var rating_bubble_phase = {
      type: "html-slider-response",
      stimulus: "<p class = center-block-text>" + rating_prompt + "</p>",
      labels: rating_buttons,
      data: {
        exp_stage: "main_trial_rate_bubble_" + (ii + 1).toString(),
        image: main_seq[ii],
      },
      on_finish: function (data) {
        rating_history.push(data.response);
        save_data();
      },
    };
    block_sequence.push(rating_bubble_phase);
  }

  return block_sequence;
}
