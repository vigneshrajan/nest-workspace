## GENERATE CERTIFICATE 
```
openssl req -x509 -days 3000 -nodes -newkey rsa:1024 -keyout private_key.pem -out certificate.pem
```

```
openssl x509 -in certificate.pem  -text -noout
sudo openssl x509 -outform der -in certificate.pem -out certificate.der

```



## Docker arch build
https://www.docker.com/blog/getting-started-with-docker-for-arm-on-linux/
```
$ git clone git://github.com/docker/buildx && cd buildx
$ make install
$ export DOCKER_CLI_EXPERIMENTAL=enabled
$ docker run --rm --privileged docker/binfmt:820fdd95a9972a5308930a2bdfb8573dd4447ad3

$ docker buildx create --name datascrapper
$ docker buildx use datascrapper
$ docker buildx inspect --bootstrap

docker buildx build --platform linux/amd64,linux/arm64 -t datawatt/av-ds-cron:latest -f ./docker/dockerfile-cron --build-arg NPMTOKEN=${NPMTOKEN} .