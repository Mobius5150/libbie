(typeof $ !== 'undefined' ? $ : jQuery)(document).ready(function($){
	var template = '<div class="addedIsbn {{isbn}}"> \
				<img class="cover" src=""/> \
				<div> \
					<span class="isbn">ISBN #{{isbn}}</span> \
					<span class="title">Title: </span> \
					<span class="author">Author: </span> \
					<div class="srcclear"> </div><div class="sources"><a href="#" target="_blank" class="source goodreads"></a></div> \
				</div> \
				<div class="clear"></div> \
			</div> ';
	var config = {
		isbnInput: $('input#isbn'),
		welcomePrompt: $('app-welcome-prompt'),
		donationPrompt: $('donation-welcome-prompt'),
		donationSearchThreshold: 5,
		serverUrl: 'http://localhost:3000',
		welcomePromptShown: false,
		donationPromptShown: false,
	};
	
	var account = null;
	var numSearches = 0;

	config.isbnInput.focus();

	var socket = io(config.serverUrl);
	socket.on('connected', function() {
		socket.emit('getClientInfo');
	})
	
	socket.on('error', function (data) {
		console.log("Server sent error: ", data);
	});

	socket.on('isbnIdentified', function isbnIdentified(data) {
		console.log("ISBN Identified: ", data);

		var book = data.books[0];console.log(book);

		var authors = [];
		for (var author in book.authors) {
			authors.push(book.authors[author].author[0].name);
		}

		// TODO: Should use handlebars
		$('.addedIsbn.' + data.isbn + ' .title').text(book.title);
		$('.addedIsbn.' + data.isbn + ' .author').text(authors.join(', '));
		$('.addedIsbn.' + data.isbn + ' img.cover').attr('src', book.image_url[0]).animate({opacity: 1});
		$('.addedIsbn.' + data.isbn + ' a.goodreads').attr('href', book.link[0]).animate({opacity: 1});
	});
	
	socket.on('getClientInfo', function getClientInfo(data) {
		if (typeof data !== 'object') {
			console.error("Client info not object.");
			return;
		}
		
		account = data;
		
		if (!config.welcomePromptShown) {
			// Show the welcome prompt if not hidden
			runIfUserPropertyEquals('showWelcomePrompt', true, wrapFuncCB(showWelcomePrompt, true));
		}
	});

	$(document.body).on('keydown', function(e) {
		if(document.activeElement.id !== config.isbnInput.id) {
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
		showWelcomePrompt(false);
	});

	config.isbnInput.keypress(function keypressHandler(event) {
		var entryKey = 'Enter';
		if (typeof account !== 'undefined' && typeof account.entryKey !== 'undefined') {
			entryKey = account.entryKey;
		}
		
		if (event.key === entryKey) {
			config.isbnInput.focus();

			var isbn = parseIsbn(config.isbnInput.val());
			console.log("Isbn: ", isbn, isbn.length);
			if (!validateIsbn(isbn)) {
				alert("Invalid isbn!");
				return;
			}

			if (++numSearches >= config.donationSearchThreshold && !config.donationPromptShown) {
				runIfUserPropertyEquals('hasDonated', false, wrapFuncCB(showDonationPrompt, true));
			}

			config.isbnInput.val('');

			socket.emit('addIsbn', {
				isbn: isbn,
			});

			$('#searchList').prepend(template.replace(/\{\{isbn\}\}/g, isbn));
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
			$('body').remove('.prompt-cover');
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
		var args = arguments.splice(0, 1);
		return function() {
			func.apply($this, args);
		}
	}
	
	function runIfUserPropertyEquals(property, desiredValue, callback) {
		if (account !== null && typeof account.property !== 'undefined' && account.property === desiredValue) {
			callback();
		}
	}
});