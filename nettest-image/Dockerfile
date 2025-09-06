cat <<EOF > Dockerfile
FROM ubuntu:22.04

# Install tc and ping
RUN apt update && apt install -y iproute2 iputils-ping

# Keep container alive
CMD ["sleep", "infinity"]
EOF
