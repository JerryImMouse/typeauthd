#!/bin/bash
openssl req -new -newkey rsa:2048 -days 365 -nodes -keyout ./cert/server.key -out ./cert/server.csr
openssl x509 -req -in ./cert/server.csr -signkey ./cert/server.key -out ./cert/server.cert -days 365
file ./cert/server.key ./cert/server.cert
