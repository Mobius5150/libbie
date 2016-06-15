(typeof $ !== 'undefined' ? $ : jQuery)(document).ready(function($){
	var template = '<div class="addedIsbn {{isbn}}"> \
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

	var searchingTemplate = '<div class="addedIsbn {{isbn}} searching"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div> ';

	var notFoundTemplate = '<div class="addedIsbn {{isbn}} notFound">Could not find book with ISBN <span class="isbn">{{isbn}}</span></div> ';

	var config = {
		isbnInput: $('input#isbn'),
		welcomePrompt: $('.app-welcome-prompt'),
		donationPrompt: $('.donation-prompt'),
		conditionInput: $('#condition'),
		donationSearchThreshold: 5,
		serverUrl: '//libbie.azurewebsites.net',
		welcomePromptShown: false,
		donationPromptShown: false,
		notFoundCssProperties: { backgroundColor: '#333333' },
		notFoundAnimateSpeed: 700,
	};
	
	var account = null;
	var numSearches = 0;

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
			$('.addedIsbn.notFound.' + data.searchIsbn).animate(config.notFoundCssProperties, config.notFoundAnimateSpeed);
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
		var img = new Image();
		img.src = book.image_url;
		img.onload = function () {
			$('.addedIsbn.searching.' + data.isbn).replaceWith(template.replace(/\{\{isbn\}\}/g, data.isbn));
			$('.addedIsbn.' + data.isbn + ' .title').text(book.title);
			$('.addedIsbn.' + data.isbn + ' .author').text(authors.join(', '));
			$('.addedIsbn.' + data.isbn + ' img.cover').attr('src', book.image_url).animate({opacity: 1});
			$('.addedIsbn.' + data.isbn + ' a.goodreads').attr('href', book.link).animate({opacity: 1});
		}
	});

	socket.on('bookAdded', function (data) {
		console.log('Book added: ', data);
		var condition = false;
		
		if ($('#condition option[value=' + data.condition + ']').length > 0) {
			condition = ('#condition option[value=' + data.condition + ']').html();
		}

		if (condition) {
			$('.addedIsbn.' + data.isbn + ' .addresult').html('Added to owned books in ' + condition + ' condition');
		} else {
			$('.addedIsbn.' + data.isbn + ' .addresult').html('Added to owned books');
		}
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
		if(document.activeElement.id !== config.isbnInput.id && !$(document.activeElement).is('input, select')) {
			config.isbnInput.focus();
		}
	});
	
	$('.share-facebook', config.donationPrompt).click(function () {
		// TODO: Show facebook share
	});
	
	$('.share-twitter', config.donationPrompt).click(function () {
		// TODO: Show twitter share
	});
	
	$('.donate', config.donationPrompt).click(function () {
		// TODO: Show donate window
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

	config.isbnInput.keypress(function keypressHandler(event) {
		var entryKey = 'Enter';
		if (account !== null && typeof account.entryKey !== 'undefined') {
			entryKey = account.entryKey;
		}
		
		if (event.key === entryKey) {
			config.isbnInput.focus();

			var isbn = parseIsbn(config.isbnInput.val());

			if (!validateIsbn(isbn)) {
				alert("Invalid isbn!");
				return;
			}

			if (++numSearches >= config.donationSearchThreshold && !config.donationPromptShown) {
				runIfUserPropertyEquals('hasDonated', false, wrapFuncCB(showDonationPrompt, true));
			}

			config.isbnInput.val('');

			var condition = parseInt(config.conditionInput.val());

			socket.emit('addIsbn', {
				condition: condition,
				isbn: isbn,
			});

			$('#searchList').prepend(searchingTemplate.replace(/\{\{isbn\}\}/g, isbn));
		}
	});

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
			$('body').append(promptBg);
			$(prompt).show();
		} else {
			$('#prompt-cover').remove();
			$(prompt).hide();
		}
	}
	
	function showWelcomePrompt(show) {
		config.welcomePromptShown |= show;
		showPrompt(config.welcomePrompt, show);
	}
	
	function showDonationPrompt(show) {
		config.donationPromptShown |= show;
		showPrompt(config.donationPrompt, show);
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
});