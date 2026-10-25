FROM python:3.12-slim
# Cai thu vien pho bien cho lap trinh thi (toan hoc, thao tac du lieu, thuat toan)
RUN pip install --no-cache-dir \
    numpy==1.26.4 \
    scipy==1.13.1 \
    sympy==1.13.1 \
    pandas==2.2.2 \
    matplotlib==3.9.0 \
    networkx==3.3 \
    sortedcontainers==2.4.0 \
    more-itertools==10.3.0 \
    bitarray==2.9.2
RUN useradd -m nobody2 || true
