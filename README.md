

Basic webserver library to serve files in a folder.
But can also have specific paths like /api/ that is handled by custom function, and the need for that was why this was created in the first place.

Basically this library is perfect for projects that is mostly backend, but also need to some files served.
For instance a searchengine where you need a webpage that pull data from the backend.

It don't contain bells and wissles, it's just quick and only uses vanilla nodejs so no need to install external libraries.
Also note that its currently just 139 lines of code, of them 50 are defining mimetypes, and 10 lines of comments, it's very lightweight in every sense of the word.
