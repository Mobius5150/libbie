$(document).ready(function(){
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
		entryKey: 'Enter',
		isbnInput: $('input#isbn'),
	};

	config.isbnInput.focus();

	var socket = io('http://localhost:3000');
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

	$(document.body).on('keydown', function(e) {
		if(document.activeElement.id !== config.isbnInput.id) {
			config.isbnInput.focus();
		}
	});

	config.isbnInput.keypress(function keypressHandler(event) {
		if (event.key === config.entryKey) {
			config.isbnInput.focus();

			var isbn = parseIsbn(config.isbnInput.val());
			console.log("Isbn: ", isbn, isbn.length);
			if (!validateIsbn(isbn)) {
				alert("Invalid isbn!");
				return;
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
});