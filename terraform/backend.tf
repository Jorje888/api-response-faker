terraform {
  backend "s3" {
    bucket         = "s3-ec1-final-project-terraform"
    key            = "terraform.tfstate"
    region         = "eu-north-1"
    use_lockfile   = true
    encrypt        = true
  }
}
