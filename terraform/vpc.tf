resource "aws_vpc" "main" {
 cidr_block = "10.14.0.0/24"
 tags = {
   Name = "vpc-ec1-terraform-automated-vpc"
 }
}

resource "aws_subnet" "subnet1" {
 vpc_id     = aws_vpc.main.id
 cidr_block = "10.14.0.0/26"
 availability_zone = "eu-north-1a"
 tags = {
   Name = "sbn-ec1-1a-terraform-automated-subnet"
 }
}

resource "aws_subnet" "subnet2" {
 vpc_id     = aws_vpc.main.id
 cidr_block = "10.14.0.64/26"
 availability_zone = "eu-north-1b"
 tags = {
   Name = "sbn-ec1-1b-terraform-automated-subnet"
 }
}


resource "aws_subnet" "monitoring_subnet" {
 vpc_id     = aws_vpc.main.id
 cidr_block = "10.14.0.128/26"
 availability_zone = "eu-north-1c"
 tags = {
   Name = "sbn-ec1-1c-terraform-automated-subnet"
 }
}

resource "aws_subnet" "nat_subnet" {
 vpc_id     = aws_vpc.main.id
 cidr_block = "10.14.0.192/26"
 availability_zone = "eu-north-1a"
 tags = {
   Name = "sbn-ec1-1a-terraform-automated-public-subnet"
 }
}
