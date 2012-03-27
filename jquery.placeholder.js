/*! http://mths.be/placeholder v2.0.6 by @mathias */
;(function(window, document, $) {

    var isInputSupported = 'placeholder' in document.createElement('input'),
        isTextareaSupported = 'placeholder' in document.createElement('textarea'),
        prototype = $.fn,
        valHooks = $.valHooks,
        hooks,
        placeholder;

    if (isInputSupported && isTextareaSupported) {

        placeholder = prototype.placeholder = function() {
            return this;
        };

        placeholder.input = placeholder.textarea = true;

    } else {

        placeholder = prototype.placeholder = function() {
            var $this = this;
            $this
                .filter((isInputSupported ? 'textarea' : ':input') + '[placeholder]')
                .not('.placeholder')
                .bind({
                    'focus.placeholder': setCursorToLeft,
                    'blur.placeholder': setPlaceholder,
                    'keydown.placeholder': clearPlaceholder,
                    'keyup.placeholder': setPlaceholderIfEmpty,
                    'mouseup.placeholder': setCursorToLeft,
                    'mousedown.placeholder': setCursorToLeft
                })
                .data('placeholder-enabled', true)
                .trigger('blur.placeholder');
            return $this;
        };

        placeholder.input = isInputSupported;
        placeholder.textarea = isTextareaSupported;

        hooks = {
            'get': function(element) {
                var $element = $(element);
                return $element.data('placeholder-enabled') && $element.hasClass('placeholder') ? '' : element.value;
            },
            'set': function(element, value) {
                var $element = $(element);
                if (!$element.data('placeholder-enabled')) {
                    return element.value = value;
                }
                if (value == '') {
                    element.value = value;
                    // Issue #56: Setting the placeholder causes problems if the element continues to have focus.
                    if (element != document.activeElement) {
                        // We can’t use `triggerHandler` here because of dummy text/password inputs :(
                        setPlaceholder.call(element);
                    }
                } else if ($element.hasClass('placeholder')) {
                    clearPlaceholder.call(element, true, value) || (element.value = value);
                } else {
                    element.value = value;
                }
                // `set` can not return `undefined`; see http://jsapi.info/jquery/1.7.1/val#L2363
                return $element;
            }
        };

        isInputSupported || (valHooks.input = hooks);
        isTextareaSupported || (valHooks.textarea = hooks);

        $(function() {
            // Look for forms
            $(document).delegate('form', 'submit.placeholder', function() {
                // Clear the placeholder values so they don’t get submitted
                var $inputs = $('.placeholder', this).each(clearPlaceholder);
                setTimeout(function() {
                    $inputs.each(setPlaceholder);
                }, 10);
            });
        });

        // Clear placeholder values upon page reload
        $(window).bind('beforeunload.placeholder', function() {
            $('.placeholder').each(function() {
                this.value = '';
            });
        });
    }

    function setPlaceholderIfEmpty(event, value) {
        var input = this;
        if (!input.value) {
            setPlaceholder.call(input);
            setCursorToLeft.call(input);
        }
    }

    function args(elem) {
        // Return an object of element attributes
        var newAttrs = {},
            rinlinejQuery = /^jQuery\d+$/;
        $.each(elem.attributes, function(i, attr) {
            if (attr.specified && !rinlinejQuery.test(attr.name)) {
                newAttrs[attr.name] = attr.value;
            }
        });
        return newAttrs;
    }

    function clearPlaceholder(event, value) {
        // Don't clear if just a modifier key was pressed.
        if (event && event.keyCode < 48) {
            return null;
        }
        var input = this,
            $input = $(input),
            hadFocus;
        if (input.value == $input.attr('placeholder') && $input.hasClass('placeholder')) {
            hadFocus = input == document.activeElement;
            if ($input.data('placeholder-password')) {
                $input = $input.hide().next().show().attr('id', $input.removeAttr('id').data('placeholder-id'));
                // If `clearPlaceholder` was called from `$.valHooks.input.set`
                if (event === true) {
                    return $input[0].value = value;
                }
                $input.focus();
            } else {
                input.value = '';
                $input.removeClass('placeholder');
            }
            hadFocus && input.select();
        }
        return true;
    }

    function setPlaceholder() {
        var $replacement,
            input = this,
            $input = $(input),
            id = this.id;
        if (input.value == '') {
            if (input.type == 'password') {
                if (!$input.data('placeholder-textinput')) {
                    try {
                        $replacement = $input.clone().attr({ 'type': 'text' });
                    } catch(e) {
                        $replacement = $('<input>').attr($.extend(args(this), { 'type': 'text' }));
                    }
                    $replacement
                        .removeAttr('name')
                        .data({
                            'placeholder-password': true,
                            'placeholder-id': id
                        })
                        .bind({
                            'focus.placeholder': setCursorToLeft,
                            'keydown.placeholder': clearPlaceholder,
                            'mouseup.placeholder': setCursorToLeft,
                            'mousedown.placeholder': setCursorToLeft
                        });
                    $input
                        .data({
                            'placeholder-textinput': $replacement,
                            'placeholder-id': id
                        })
                        .before($replacement);
                }
                $input = $input.removeAttr('id').hide().prev().attr('id', id).show();
                // Note: `$input[0] != input` now!
            }
            $input.addClass('placeholder');
            $input[0].value = $input.attr('placeholder');
        } else if(!($input[0].value == $input.attr('placeholder'))){
            $input.removeClass('placeholder');
        }
    }

    function setCursorPosition(obj, position) {
        var r1;
        if (obj.setSelectionRange) {
            obj.focus();
            obj.setSelectionRange(position, position);
        } else if (obj.createTextRange) {
            var range = obj.createTextRange();
            range.move("character", position);
            range.select();
        } else if (window.getSelection) {
            var s = window.getSelection();
            r1 = document.createRange();
            var walker = document.createTreeWalker(obj, NodeFilter.SHOW_ELEMENT, null, false);
            var p = position;
            var n = obj;
            while (walker.nextNode()) {
                n = walker.currentNode;
                if (p > n.value.length) {
                    p -= n.value.length;
                }
                else break;
            }
            n = n.firstChild;
            r1.setStart(n, p);
            r1.setEnd(n, p);
            s.removeAllRanges();
            s.addRange(r1);
        } else if (document.selection) {
            r1 = document.body.createTextRange();
            r1.moveToElementText(obj);
            r1.setEndPoint("EndToEnd", r1);
            r1.moveStart('character', position);
            r1.moveEnd('character', position - obj.innerText.length);
            r1.select();
        }
    }
    
    function setCursorToLeft(event, value) {
        var input = this,
            $input = $(input);
        if (input.value == $input.attr('placeholder') && $input.hasClass('placeholder')) {
            setCursorPosition(input, 0);
        }
    }
    
}(this, document, jQuery));