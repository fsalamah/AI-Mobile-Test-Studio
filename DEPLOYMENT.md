# Deployment Guide for AI Studio and Backend Service

This document provides detailed instructions for deploying the AI Studio and AI Backend Service components in various environments.

## Docker Deployment

The simplest way to deploy both components is using Docker Compose.

### Prerequisites

- Docker and Docker Compose installed
- OpenAI API key
- At least 2GB of RAM and 1 CPU core for each container

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/appium/appium-inspector.git
   cd appium-inspector
   ```

2. **Create environment file**:
   Create a `.env` file in the root directory:
   ```
   API_KEY=your-api-key-here
   OPENAI_API_KEY=your-openai-api-key-here
   ```

3. **Build and start the containers**:
   ```bash
   docker-compose up -d
   ```

4. **Verify deployment**:
   ```bash
   # Check container status
   docker-compose ps
   
   # Check logs
   docker-compose logs -f
   ```

5. **Access the applications**:
   - AI Studio: http://localhost:3000
   - AI Backend Service: http://localhost:3001

### Configuration Options

You can customize the deployment by modifying the Docker Compose file:

- **Ports**: Change the exposed ports in the `ports` section
- **Environment Variables**: Add or modify environment variables in the `environment` section
- **Volumes**: Add persistent volumes in the `volumes` section
- **Resource Limits**: Add resource constraints using `deploy.resources` configuration

## Standalone Deployment

You can also deploy each component separately on dedicated servers.

### AI Backend Service

1. **Clone the repository**:
   ```bash
   git clone https://github.com/appium/appium-inspector.git
   cd appium-inspector/ai-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the `ai-backend` directory:
   ```
   PORT=3001
   HOST=0.0.0.0
   API_KEY=your-api-key-here
   OPENAI_API_KEY=your-openai-api-key-here
   ```

4. **Build and start the service**:
   ```bash
   npm run build
   npm start
   ```

### AI Studio Frontend

1. **Clone the repository**:
   ```bash
   git clone https://github.com/appium/appium-inspector.git
   cd appium-inspector/ai-studio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the `ai-studio` directory:
   ```
   REACT_APP_API_URL=http://your-backend-server:3001/api
   ```

4. **Build the application**:
   ```bash
   npm run build
   ```

5. **Serve the built files**:
   You can use any web server to serve the static files in the `build` directory.
   
   Example with nginx:
   ```bash
   # Install nginx
   apt-get update && apt-get install -y nginx
   
   # Copy build files to nginx directory
   cp -r build/* /var/www/html/
   
   # Configure nginx to serve the app and proxy API requests
   cat > /etc/nginx/conf.d/default.conf << 'EOL'
   server {
       listen 80;
       root /var/www/html;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api/ {
           proxy_pass http://your-backend-server:3001/api/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   EOL
   
   # Restart nginx
   service nginx restart
   ```

## Cloud Deployment

### AWS Deployment

1. **Create an EC2 instance**:
   - Amazon Linux 2 or Ubuntu Server
   - t3.medium or larger (2 vCPU, 4 GB RAM minimum)
   - Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000, and 3001

2. **SSH into the instance**:
   ```bash
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

3. **Install Docker and Docker Compose**:
   ```bash
   # Install Docker
   sudo yum update -y
   sudo amazon-linux-extras install docker -y
   sudo service docker start
   sudo usermod -a -G docker ec2-user
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.17.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

4. **Deploy the application**:
   Follow the Docker Deployment steps above.

### Google Cloud Platform

1. **Create a Compute Engine VM**:
   - e2-medium or larger (2 vCPU, 4 GB RAM minimum)
   - Ubuntu 20.04 LTS
   - Allow HTTP, HTTPS traffic

2. **SSH into the VM**:
   ```bash
   gcloud compute ssh your-vm-name
   ```

3. **Install Docker and Docker Compose**:
   ```bash
   # Install Docker
   sudo apt-get update
   sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
   sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
   sudo apt-get update
   sudo apt-get install -y docker-ce
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.17.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

4. **Deploy the application**:
   Follow the Docker Deployment steps above.

## Scaling Considerations

### Horizontal Scaling

For high-traffic scenarios, you can scale the components horizontally:

1. **AI Backend Service**:
   - Deploy multiple instances behind a load balancer
   - Use Redis for job queue and shared state
   - Configure sticky sessions on the load balancer

2. **AI Studio Frontend**:
   - Deploy multiple instances behind a load balancer
   - Use a CDN for static assets

### Resource Requirements

| Component | Minimum | Recommended | High Traffic |
|-----------|---------|-------------|--------------|
| AI Backend | 1 CPU, 2GB RAM | 2 CPU, 4GB RAM | 4 CPU, 8GB RAM |
| AI Studio | 0.5 CPU, 1GB RAM | 1 CPU, 2GB RAM | 2 CPU, 4GB RAM |
| Redis | 0.5 CPU, 1GB RAM | 1 CPU, 2GB RAM | 2 CPU, 4GB RAM |

## Maintenance

### Monitoring

1. **Health Checks**:
   - AI Backend Service: http://your-backend:3001/api/health
   - Redis: Use `redis-cli ping` command

2. **Logs**:
   - Docker logs: `docker-compose logs -f`
   - Backend logs: `docker-compose logs -f ai-backend`
   - Frontend logs: `docker-compose logs -f ai-studio`

### Backups

1. **Redis Data**:
   ```bash
   # Backup Redis data
   docker exec -it appium-inspector_redis_1 redis-cli SAVE
   docker cp appium-inspector_redis_1:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
   ```

2. **Application Data**:
   ```bash
   # Backup AI Backend data
   docker cp appium-inspector_ai-backend_1:/app/data ./ai-backend-data-backup-$(date +%Y%m%d)
   ```

### Updates

1. **Pull Latest Changes**:
   ```bash
   git pull
   ```

2. **Rebuild and Restart**:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

## Troubleshooting

### Common Issues

1. **Connection Refused**:
   - Check that the containers are running: `docker-compose ps`
   - Verify that the ports are correctly mapped: `docker-compose port ai-backend 3001`
   - Check firewall settings: ensure ports 3000 and 3001 are open

2. **Authentication Failures**:
   - Verify that the API key is correctly set in the .env file
   - Check that requests include the X-API-Key header

3. **OpenAI API Errors**:
   - Verify that the OpenAI API key is valid and has sufficient quota
   - Check the AI Backend Service logs for specific error messages

4. **Performance Issues**:
   - Check resource usage: `docker stats`
   - Consider scaling up resources or deploying additional instances

### Support

For additional help, please:

1. Check the [GitHub Issues](https://github.com/appium/appium-inspector/issues) for known problems
2. Join the [Appium Discussion Forum](https://discuss.appium.io) to ask questions
3. Create a new issue on GitHub if you discover a bug

## Security Considerations

1. **API Key Protection**:
   - Use a strong, random API key
   - Rotate the key periodically
   - Use HTTPS in production environments

2. **HTTPS Configuration**:
   - Use Let's Encrypt to obtain free SSL certificates
   - Configure proper SSL settings in nginx or your preferred web server

3. **Network Security**:
   - Use a firewall to restrict access to the backend service
   - Consider using a VPN or private network for internal deployments

4. **OpenAI API Key**:
   - Set usage limits on your OpenAI account
   - Monitor API usage regularly