

var readInterval = null,
    readIndex = 0,
    preparedChunks = [],
    prefs = {
        speed: 200,
        night: false,
        merge: true
    };


function prepare(text) {
    preparedChunks = [];

    // Split the text into an array of words and TeX equations
    // The regular expression matches:
    // - TeX equations enclosed in $$ or $
    // - Non-whitespace characters (words)
    var regex = /(\$\$.*?\$\$)|(\$.*?\$)|([^\s]+)/g;
    var words = text.match(regex);
    // for(i = 0; i < lines.length; i++) {
    //     var lineWords = lines[i].split(' ');
    //     for(i2 = 0; i2 < lineWords.length; i2++) {
    //         if(lineWords[i2] !== '') {
    //             var trimmedWord = $('<div />').text($.trim(lineWords[i2])).html();
    //             words.push(trimmedWord);
    //         }
    //     }
    // }

    var merged = false,
        dotPattern = /.*\./;
    for(i = 0; i < words.length; i++) {
        if(words[i] !== '') {
            var isSentenceEnd = false;
            // Check if the current word ends with a dot (sentence end)
            if(words[i].match(dotPattern)) {
                isSentenceEnd = true;
            }
            // Merge short words (length <= 3) with the previous word if:
            // - Merging is enabled (prefs.merge)
            // - The word is not merged with the previous word already
            // - The current index is greater than 0 (not the first word)
            // - The current word is not a TeX equation (doesn't start with $)
            if (prefs.merge && words[i].length <= 3 && !merged && i > 0 && !words[i].startsWith('$')) {
                var index = preparedChunks.length - 1;
                preparedChunks[index].text += ' ' + words[i];
                preparedChunks[index].sentenceEnd = isSentenceEnd;
                merged = true;
            } else {
                // if (words[i].startsWith('$') && !words[i].startsWith('$$')) {
                //     words[i] = '<span class="inline-eq">' + words[i] + '</span>';
                // }
                // Add the word or TeX equation as a new chunk
                preparedChunks.push({text: words[i], sentenceEnd: isSentenceEnd});
                merged = false;
            }
        }
    }

    // Update the text info with the number of words
    $('#text-info').html('Words: ' + words.length).show();
    // Set the 'prepared' data attribute on the body element to true
    $('body').data('prepared', true);
}





function start() {
    if(preparedChunks.length === 0) {
        return false;
    }
    interval = 1000 / (prefs.speed / 60);
    readInterval = window.setInterval(flashWords, interval, preparedChunks);
    $('#start').html('Pause');
    $('body').data('reading', true);
}

function stop() {
    window.clearInterval(readInterval);
    $('#start').html('Read!');
    $('body').data('reading', false);
}

function flashWords(array) {
    var chunk = array[readIndex],
        length = array.length;
    if (readIndex == length) {
        stop();
        readIndex = 0;
    } else {
        readIndex++;
    }

    $('#word').html(chunk.text);  // Set the text or equation in the display element

    if (chunk.text.includes('$') && !chunk.text.startsWith('$$')) {
        // Process as inline equation
        MathJax.typesetPromise([document.getElementById('word')]).then(function() {
            // Additional logic after typesetting can be placed here if needed
        });
    } else if (chunk.text.startsWith('$$')) {
        // Process as display equation
        $('#word .mjx-chtml').css('display', 'block');
        MathJax.typesetPromise([document.getElementById('word')]);
    }
    
    $('#text-progress').attr({
        'max': preparedChunks.length,
        'value': readIndex,
        'step': 1
    }).show();
}

function savePrefs() {
    localStorage.setItem('prefs', JSON.stringify(prefs));
}



$(document).ready(function() {
    if(localStorage.getItem('prefs') === null) {
        localStorage.setItem('prefs', JSON.stringify(prefs));
    } else {
        prefs = JSON.parse(localStorage.getItem('prefs'));
    }

    $('#reading-speed').val(prefs.speed);
    if(prefs.night === true) {
        $('body').addClass('night');
        $('#night-mode').attr('checked', 'checked');
    }
    if(prefs.merge === false) {
        $('#merge').attr('checked', false);
    }

    $('body').data({'reading': false, 'prepared': false});
    prepare($('#text-to-read').val());

    $('#start').on('click', function() {
        var data = $('body').data();
        if(data.reading === false) {
            if(data.prepared === false) {
                var text = $('#text-to-read').val();
                prefs.speed = parseInt($('#reading-speed').val());
                if(text.length > 1 && prefs.speed > 0) {
                    prepare(text);
                } else {
                    alert('No text to read (or invalid speed settings)');
                }
            }
            $('#text-to-read').fadeOut(250, function() {
                start();
                $('#reading-screen, #new').fadeIn(250);
            });
            $('h1').animate({height: 0, opacity: 0}, 500);
            $('#other').fadeOut(500);
            $('#merge').attr('disabled', true).parent().css('opacity', 0.5);
        } else {
            stop();
        }
    });

    $('#text-to-read').on('keyup', function() {
        readIndex = 0;
        prepare($(this).val())
    });

    $('#reading-speed').on('change', function() {
        prefs.speed = parseInt($(this).val());
        console.log(prefs.speed)
        savePrefs();
        if($('body').data('reading') === true) {
            stop();
            start();
        }
    });

    $('#text-progress').on('mousedown touchstart', function() {
        if($('body').data('reading')) {
            stop();
            $('body').data('reading', 'paused');
        }
        $(this).on('mousemove touchmove', function() {
            var newIndex = $(this).val();
            $('#word').html(preparedChunks[newIndex].text);

        });
    }).on('mouseup touchend', function() {
        readIndex = $(this).val();
        $(this).off('mousemove');
        if($('body').data('reading') === 'paused') {
            start();
        }
    });

    $('#new').on('click', function() {
        $('#reading-screen').hide();
        $('#text-to-read, #other').fadeIn(500);
        $('h1').animate({height: '26px', opacity: 1}, 500);
        $(this).fadeOut(500);
        $('#merge').attr('disabled', false).parent().css('opacity', 1);
        if($('body').data('reading') === true) {
            stop();
        }
    });

    $('#night-mode').on('change', function() {
        if($(this).is(':checked')) {
            $('body').addClass('night');
            prefs.night = true;
        } else {
            $('body').removeClass('night');
            prefs.night = false;
        }
        savePrefs();
    });

    $('#merge').on('change', function() {
        if($(this).is(':checked')) {
            prefs.merge = true;
        } else {
            prefs.merge = false;
        }
        savePrefs();
        prepare($('#text-to-read').val());
    });

    $('body').on('keyup', function(e) {
        console.log(e.keyCode)
        if($('#text-to-read').is(':focus')) {
            return false;
        }
        if(e.keyCode == 80 || e.keyCode == 32) {
            // P or Space
            // Play/pause
            if($('body').data('reading') === true) {
                stop();
            } else {
                start();
            }
        } else if(e.keyCode == 39) {
            // Right arrow
            // Increase WPM by 25
            $('#reading-speed').val(prefs.speed + 25).trigger('change');
        } else if(e.keyCode == 37) {
            // Left arrow
            // Decrease WPM by 25
            $('#reading-speed').val(prefs.speed - 25).trigger('change');
        } else if(e.keyCode == 66) {
            // B key
            // Go back 10 words
            if($('body').data().reading === true) {
                if(readIndex < 10) {
                    readIndex = 0;
                } else {
                    readIndex = readIndex - 10;
                }
                $('#word').html(preparedChunks[readIndex].text);
                $('#text-progress').val(readIndex);
            }

        }
    });
});