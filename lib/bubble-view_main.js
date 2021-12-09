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

var maximum_click = 18;
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
var dropbox_access_token = "KQyGHv36u2EAAAAAAAAAAU-2_MkvOFrpL2vCOK55E-G_k9UBlzL5KRVPCqajf3Q8";
var save_filename = "/" + task_id + "_" + sbj_id + ".json";
var log_filename = "/log.json";

function load_data(cb) {
  // load data from dropbox
  // cb is a callback function
  if (flag_debug) {
    console.log("Save data function called.");
    console.log(jsPsych.data.get().json());
  }
  var defaultValue = {
    stats: { count_0: 0, count_1: 0, count_2: 0, count_3: 0 },
    history: []
  };
  try {
    var dbx = new Dropbox.Dropbox({
      accessToken: dropbox_access_token,
    });
    dbx
      .filesDownload({ path: log_filename })
      .then(function(response) {
        console.log(response);
        return response.result.fileBlob.text();
      })
      .then(function(jsonData) {
        console.log(jsonData);
        cb(JSON.parse(jsonData));
      })
      .catch(function (error) {
        console.log(error);
        cb(defaultValue);
      })
  } catch (err) {
    console.log("Loading log file function failed.", err);
    cb(defaultValue);
  }
}

function save_data(pressedKey) {
  // pressedKey should look like count_2
  // if you prefer json-format, use jsPsych.data.get().json()
  // if you prefer csv-format, use jsPsych.data.get().csv()
  var jsonData = jsPsych.data.get().json()
  var jsonObject = JSON.parse(jsonData);
  var practiceIdStage = jsonObject.find(({ exp_stage }) => exp_stage === "practice_id_entry");
  var proli_id = JSON.parse(practiceIdStage.responses).proli_id;
  var item = {
    proli_id,
    button_pressed: Number(pressedKey.substr(6))
  };

  // add proli_id and pressed status to jsonObject
  jsonObject.push(item);

  jsonData = JSON.stringify(jsonObject);

  if (flag_debug) {
    console.log("Save data function called.");
    console.log(jsonData);
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
          contents: jsonData,
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

  try {
    load_data(function(log) {
      var dbx = new Dropbox.Dropbox({
        // fetch: fetch,
        accessToken: dropbox_access_token,
      });
      log.history.push(item);
      log.stats[pressedKey]++;
      console.log(log);
      dbx
        .filesUpload({
          path: log_filename,
          mode: "overwrite",
          mute: true,
          contents: JSON.stringify(log),
        })
        .then(function (response) {
          if (flag_debug) {
            console.log(response);
          }
        })
        .catch(function (error) {
          console.error(error);
        });
    });
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
  bubble_radius = 90
) {
  var block_sequence = [];
  var num_trial = prac_seq.length;

  for (var ii = 0; ii < num_trial; ii++) {
    /*var start_trial = {
      type: "instructions",
      pages: [
        "<p class = block-text>" +
          "Click 'Next' to begin the practice trial " +
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
    block_sequence.push(start_trial);*/

    var bubble_phase = {
      type: "bubble-view",
      org_image: prac_img_src + prac_seq[ii] + "." + img_ext,
      blur_image: prac_blur_src + prac_seq[ii] + "." + img_ext,
      prompt:
        "<div class = block-text><p class = center-block-text>To the best of your knowledge, how accurate are the claim(s) in this post?</p> <p class = understate>  " +
        "Click the post as many times as needed. On the next screen you will rate it from 1 (not at all accurate) to 4 (very accurate).</p>",
      trial_type: "fixed_viewing_duration", // 'fixed_click_maximum'
      // maximum_click: maximum_click,
      bubble_radius: bubble_radius,
      image_size: [1152, 720],
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
      type: "html-button-response",
      stimulus: "<p class = center-block-text>" + rating_prompt + "</p>",
      choices: rating_buttons,
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
  stats,
  bubble_radius = 90,
) {
  image_history = [...main_seq];

  var block_sequence = [];
  var num_trial = main_seq.length;

  var main_instructions_page = {
    type: "instructions",
    pages: [
      "<div class = centerbox ><p class = center-block-text >You have finished the practice and are about to begin the main task. " +
        "Please take this next one seriously, and do your best to correctly estimate the inaccuracy/accuracy of the claim or claims being made in this post. " +
        "Again, we very much appreciate your participation!</p>" +
        "<p class = callout>In a previous study, approximately 75% of politically conservative/liberal participants who viewed the following post found that it contains accurate/inaccurate information.</p></div>",
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
  var prompts = [
    "In a previous study, approximately 75% of politically liberal participants who viewed the following post found that it contains accurate information.",
    "In a previous study, approximately 75% of politically liberal participants who viewed the following post found that it contains inaccurate information.",
    "In a previous study, approximately 75% of politically conservative participants who viewed the following post found that it contains accurate information.",
    "In a previous study, approximately 75% of politically conservative participants who viewed the following post found that it contains inaccurate information."
  ];

  var minCount = Math.min(stats.count_0, stats.count_1, stats.count_2, stats.count_3);
  var minKeys = Object.keys(stats).filter(key => minCount === stats[key]);
  var randomKey = minKeys[Math.floor(Math.random() * minKeys.length)]; // ex: count_2

  for (var ii = 0; ii < num_trial; ii++) {
    var start_trial = {
      type: "instructions",
      pages: [
        "<div class = centerbox ><p class = center-block-text >You have finished the practice, and you are now about to begin the main task, which consists of one last post. Thank you for paying close attention!</p>" +
          `<p class = callout>${prompts[randomKey.substr(6)]}</p></div>` +
          "<p class = block-text>" +
          "Click 'Next' to view the post" +
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
        "<div class = block-text><p class = center-block-text>To the best of your knowledge, how accurate are the claim(s) in this post?</p> <p class = understate>" +
        "Click the post as many times as needed. On the next screen you will rate it from 1 (not at all accurate) to 4 (very accurate).</p>",
      trial_type: "fixed_viewing_duration", // 'fixed_click_maximum'
      bubble_radius: bubble_radius,
      image_size: [1152, 720],
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
      type: "html-button-response",
      stimulus: "<p class = center-block-text>" + rating_prompt + "</p>",
      choices: rating_buttons,
      data: {
        exp_stage: "main_trial_rate_bubble_" + (ii + 1).toString(),
        image: main_seq[ii],
      },
      on_finish: function (data) {
        rating_history.push(data.response);
        save_data(randomKey);
      },
    };
    block_sequence.push(rating_bubble_phase);
  }

  return block_sequence;
}
