data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}


resource "aws_instance" "instance_a" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"              
  key_name      = "ec1-key-pair"
  tags = {
    Name = "ec2-ec1-1a-terraform-automated-instance-backend"
  }
  subnet_id = aws_subnet.subnet1.id
  vpc_security_group_ids = [aws_security_group.sec_group.id]
  private_ip      =  "10.14.0.10"
}

resource "aws_instance" "instance_b" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"              
  key_name      = "ec1-key-pair"

  tags = {
    Name          = "ec2-ec1-1b-terraform-automated-instance-frontend"
  }
  subnet_id       = aws_subnet.subnet2.id
  vpc_security_group_ids = [aws_security_group.sec_group.id]
  private_ip      =  "10.14.0.70"
}


resource "aws_lb" "alb" {
  name               = "alb-ec1-terraform-auto-inst-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_group.id]
  subnets            = [aws_subnet.nat_subnet.id, aws_subnet.subnet2.id]

  tags = {
    Name = "alb-ec1-terraform-auto-inst-alb"
  }
}

resource "aws_lb_target_group" "target_group" {
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  tags = {
    Name = "tg-ec1-terraform-automated-target-group"
  }
}

resource "aws_lb_target_group_attachment" "registration" {
  target_group_arn = aws_lb_target_group.target_group.arn
  target_id        = aws_instance.instance_b.id
  port             = 80
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.target_group.arn
  }
}
