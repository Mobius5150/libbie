(typeof $ !== 'undefined' ? $ : jQuery)(document).ready(function($){
	var template = '<div class="addedIsbn {{isbn}} loading searching"> \
				<div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div> \
				<img class="cover" src=""/> \
				<div> \
					<span class="isbn">ISBN #{{isbn}}</span> \
					<span class="title">Title: </span> \
					<span class="author">Author: </span> \
					<div class="srcclear"> </div><div class="sources"><a href="#" target="_blank" class="source goodreads"></a></div> \
					<div class="addresult"></div> \
				</div> \
				<div class="clear"></div> \
			</div> ';

	var notFoundTemplate = '<div class="addedIsbn {{isbn}} notFound">Could not find book with ISBN <span class="isbn">{{isbn}}</span></div> ';

	var config = {
		isbnInput: $('input#isbn'),
		welcomePrompt: $('.app-welcome-prompt'),
		donationPrompt: $('.donation-prompt'),
		conditionInput: $('#condition'),
		isbnHelper: $('.isbn-helper'),
		donationSearchThreshold: 5,
		serverUrl: '//libbie.azurewebsites.net',
		welcomePromptShown: false,
		donationPromptShown: false,
		notFoundCssProperties: { backgroundColor: '#333333' },
		maxVisibleBooks: 30,
		animateSpeed: 700,
		smartScanShortIsbnTimeout: 2000,
	};
	
	var account = null;
	var numSearches = 0;
	var numVisibleSearches = 0;
	var helperVisible = true;
	var smartScanRunning = false, smartScanInterval = null, smartScanShortIsbnTimeout = null;

	config.isbnInput.focus();

	var socket = io(config.serverUrl);
	socket.emit('getClientInfo');
	
	socket.on('error', function (data) {
		console.log("Server sent error: ", data);
	});

	socket.on('apperror', function (data) {
		console.error("Application error: ", data);

		if (typeof data.searchIsbn !== 'undefined') {
			$('.addedIsbn.searching.' + data.searchIsbn).replaceWith(notFoundTemplate.replace(/\{\{isbn\}\}/g, data.searchIsbn));
			$('.addedIsbn.notFound.' + data.searchIsbn).animate(config.notFoundCssProperties, config.animateSpeed);
		}
	});

	socket.on('isbnIdentified', function isbnIdentified(data) {
		console.log("ISBN Identified: ", data);

		var book = data.books[0];

		var authors = [];
		for (var author in book.authors) {
			authors.push(book.authors[author].author.name);
		}

		// TODO: Should use handlebars
		$('.addedIsbn.' + data.isbn + ' .title').text(book.title);
		$('.addedIsbn.' + data.isbn + ' .author').text(authors.join(', '));
		$('.addedIsbn.' + data.isbn + ' img.cover').attr('src', book.image_url);
		$('.addedIsbn.' + data.isbn + ' a.goodreads').attr('href', book.link);

		var img = new Image();
		img.src = book.image_url;
		img.onload = function () {
			$('.addedIsbn.searching.' + data.isbn).removeClass('searching').removeClass('loading');
			$('.addedIsbn.loading.' + data.isbn).removeClass('loading');
			$('.addedIsbn.' + data.isbn + ' img.cover').animate({opacity: 1});
			$('.addedIsbn.' + data.isbn + ' a.goodreads').animate({opacity: 1});
		}
	});

	socket.on('bookAdded', function (data) {
		console.log('Book added: ', data);
		var condition = false;
		
		if ($('#condition option[value=' + data.request.condition + ']').length > 0) {
			condition = $('#condition option[value=' + data.request.condition + ']').html();
		}

		var baseText = 'Added to <a href="https://www.goodreads.com/owned_books/user" target="_blank" class="place-added">owned books</a>';
		if (condition) {
			$('.addedIsbn.' + data.isbn + ' .addresult:not(.added)').html(baseText + ' in <span class="condition-added">' + condition + '</span> condition');
		} else {
			$('.addedIsbn.' + data.isbn + ' .addresult:not(.added)').html(baseText);
		}

		$('.addedIsbn.' + data.isbn + ' .addresult:not(.added)').fadeIn(config.animateSpeed, function() {
			$('.addedIsbn.' + data.isbn + ' .addresult').addClass('added');
		});
	});

	socket.on('userNotifications', function (data) {
		console.log('User notifications: ', data);
	});
	
	socket.on('clientInfo', function getClientInfo(data) {
		if (typeof data !== 'object') {
			console.error("Client info not object.");
			return;
		}
		console.log('Account info: ', data);
		account = data;
		
		if (!config.welcomePromptShown) {
			// Show the welcome prompt if not hidden
			runIfUserPropertyEquals('showWelcomePrompt', true, wrapFuncCB(showWelcomePrompt, true));
		}
	});

	$(document.body).on('keydown', function(e) {
		if(document.activeElement.id !== config.isbnInput.id && !e.metaKey && !e.shiftKey && !e.ctrlKey && !$(document.activeElement).is('input, select')) {
			config.isbnInput.focus();
		}
	});
	
	$('.donate').click(function () {
		showDonationPrompt(true);
	});
	
	$('.close, .continue', config.donationPrompt).click(function () {
		showDonationPrompt(false);
	});
	
	$('.close, .continue', config.welcomePrompt).click(function () {
		if ($('.dont-show-me', config.welcomePrompt).is(':checked')) {
			account.welcomePromptShown = true;
			socket.emit('userHideWelcomePrompt', true);
		}

		showWelcomePrompt(false);
	});

	$('.smartscan').click(function () {
		if (smartScanRunning) {
			endSmartScan();
		} else {
			startSmartScan();
		}
	});

	function startSmartScan() {
		smartScanRunning = true;
		config.isbnInput.val('');

		$('#application').addClass('smartScanRunning');
		config.isbnInput.attr('data-old-placeholder', config.isbnInput.attr('placeholder'));
		config.isbnInput.attr('placeholder', 'Smart scan running... Re-scan barcode.');

		smartScanInterval = setInterval(function(){
			var newText = config.isbnInput.attr('placeholder') + '.';

			if (newText[newText.length - 6] === '.') {
				newText = 'Smart scan running... Re-scan barcode.';
			}

			config.isbnInput.attr('placeholder', newText);
		}, 1000);
	}

	function endSmartScan() {
		smartScanRunning = false;
		clearInterval(smartScanInterval);
		smartScanInterval = null;
		config.isbnInput.attr('placeholder', config.isbnInput.attr('data-old-placeholder'));
		$('#application').removeClass('smartScanRunning');
	}

	config.isbnInput.keypress(function keypressHandler(event, isCallback) {
		if (typeof isCallback !== 'boolean') {
			isCallback = false;
		}

		var entryKey = 'Enter';
		if (account !== null && typeof account.entryKey !== 'undefined') {
			entryKey = account.entryKey;
		}

		var isbn = parseIsbn(config.isbnInput.val());
		var eventKeyString = buildEventKeyString(event);
		console.log('Event key string: ', eventKeyString, isbn, validateIsbn(isbn))
		if (smartScanRunning && validateIsbn(isbn)) {
			if (isbn.length < 13 && !isCallback) {
				smartScanShortIsbnTimeout = setTimeout(function () {
					keypressHandler.call(config.isbnInput, event, true);
				}, config.smartScanShortIsbnTimeout);
				return;
			}

			console.log('Smart scan identified key combo: ', eventKeyString);
			endSmartScan();
			entryKey = account.entryKey = eventKeyString;
			socket.emit('setEntryKey', eventKeyString);
		}

		if (null !== smartScanShortIsbnTimeout) {
			clearTimeout(smartScanShortIsbnTimeout);
			smartScanShortIsbnTimeout = null;
		}

		if (eventKeyString === entryKey && (!smartScanRunning || validateIsbn(isbn))) {
			config.isbnInput.focus();

			if (!validateIsbn(isbn)) {
				alert("Invalid isbn!");
				return;
			}

			if (++numSearches >= config.donationSearchThreshold && !config.donationPromptShown) {
				runIfUserPropertyEquals('hasDonated', false, wrapFuncCB(showDonationPrompt, true));
			}

			if (++numVisibleSearches >= config.maxVisibleBooks) {
				--numVisibleSearches;
				$('#searchList .addedIsbn:last-child').fadeOut(config.animateSpeed, function () {
					$(this).remove();
				});
			}

			config.isbnInput.val('');

			var condition = parseInt(config.conditionInput.val());

			socket.emit('addIsbn', {
				condition: condition,
				isbn: isbn,
			});

			$('#searchList').prepend(template.replace(/\{\{isbn\}\}/g, isbn));

			if (helperVisible) {
				config.isbnHelper.fadeOut(config.animateSpeed);
				helperVisible = false;
			}
		}
	});

	function buildEventKeyString(e) {
		var keys = [ e.key ];

		if (e.metaKey) {
			keys.push('Meta');
		}

		if (e.shiftKey) {
			keys.push('Shift');
		}

		if (e.ctrlKey) {
			keys.push('Control');
		}

		keys.sort();
		return keys.join('+');
	}

	function validateIsbn(isbn) {
		if (typeof isbn !== 'string') {
			return false;
		}

		return null !== isbn.match(/^([0-9]{10}|[0-9]{13})$/);
	}

	function parseIsbn(isbn) {
		if (typeof isbn !== 'string') {
			return '';
		}

		isbn = isbn.replace(/-/g, '').trim();

		if (isbn.length === 9) {
			return '0' + isbn;
		}

		return isbn;
	}
	
	var promptBg = '<div id="prompt-cover"></div>'
	function showPrompt(prompt, show) {
		if (show) {
			if ($('#prompt-cover').length === 0) {
				$('body').append(promptBg);
			}

			$(prompt).show();
		} else {
			$('#prompt-cover').remove();
			$(prompt).hide();
		}
	}

	function hideAllPrompts() {
		$('.prompt').hide();
	}
	
	function showWelcomePrompt(show) {
		hideAllPrompts();
		config.welcomePromptShown |= show;
		showPrompt(config.welcomePrompt, show);
	}
	
	function showDonationPrompt(show) {
		hideAllPrompts();
		config.donationPromptShown |= show;
		showPrompt(config.donationPrompt, show);

		if (show) {
			window.location.hash = '#donate';
		} else {
			window.location.hash = '';
		}
	}
	
	function wrapFuncCB(func) {
		var $this = this;
		var args = Array.prototype.slice.call(arguments);
		args.splice(0, 1);
		return function() {
			return func.apply($this, args);
		}
	}
	
	function runIfUserPropertyEquals(property, desiredValue, callback) {
		if (account !== null && typeof account[property] !== 'undefined' && account[property] === desiredValue) {
			callback();	
		}
	}

	switch (window.location.hash) {
		case '':
			break;
		case '#welcome':
			showWelcomePrompt(true);
			break;
		case '#donate':
			showDonationPrompt(true);
			break;
	}
});