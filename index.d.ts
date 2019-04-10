export = ali_rds;

declare class ali_rds {
    constructor(options: any);

    beginDoomedTransactionScope(...args: any[]): any;

    beginTransaction(...args: any[]): any;

    beginTransactionScope(...args: any[]): any;

    end(callback: any): any;

    getConnection(): any;

}

declare namespace ali_rds {
    namespace literals {
        class Literal {
            constructor(text: any);

            toString(): any;

        }

        namespace Literal {
            namespace prototypea {
                function toString(): any;

                namespace toString {
                    // Too-deep object hierarchy from ali_rds.literals.Literal.prototype.toString
                    const prototype: any;

                }

            }

        }

        namespace now {
            const text: string;

            function toString(): any;

            namespace toString {
                const prototype: {
                };

            }

        }

    }

    namespace prototypeb {
        function beginDoomedTransactionScope(...args: any[]): any;

        function beginTransaction(...args: any[]): any;

        function beginTransactionScope(...args: any[]): any;

        function count(...args: any[]): any;

        function end(callback: any): any;

        function escape(value: any, stringifyObjects: any, timeZone: any): any;

        function escapeId(value: any, forbidQualified: any): any;

        function format(sql: any, values: any, stringifyObjects: any, timeZone: any): any;

        function get(...args: any[]): any;

        function getConnection(): any;

        function insert(...args: any[]): any;

        function query(...args: any[]): any;

        function queryOne(...args: any[]): any;

        function select(...args: any[]): any;

        function update(...args: any[]): any;

        function updateRows(...args: any[]): any;

        namespace beginDoomedTransactionScope {
            const prototype: {
            };

        }

        namespace beginTransaction {
            const prototype: {
            };

        }

        namespace beginTransactionScope {
            const prototype: {
            };

        }

        namespace count {
            const prototype: {
            };

        }

        namespace end {
            const prototype: {
            };

        }

        namespace escape {
            const prototype: {
            };

        }

        namespace escapeId {
            const prototype: {
            };

        }

        namespace format {
            const prototype: {
            };

        }

        namespace get {
            const prototype: {
            };

        }

        namespace getConnection {
            const prototype: {
            };

        }

        namespace insert {
            const prototype: {
            };

        }

        namespace literals {
            class Literal {
                constructor(text: any);

                toString(): any;

            }

            namespace Literal {
                namespace prototypec {
                    // Too-deep object hierarchy from ali_rds.prototype.literals.Literal.prototype
                    const toString: any;

                }

            }

            namespace now {
                const text: string;

                function toString(): any;

                namespace toString {
                    // Too-deep object hierarchy from ali_rds.prototype.literals.now.toString
                    const prototype: any;

                }

            }

        }

        namespace query {
            const prototype: {
            };

        }

        namespace queryOne {
            const prototype: {
            };

        }

        namespace select {
            const prototype: {
            };

        }

        namespace update {
            const prototype: {
            };

        }

        namespace updateRows {
            const prototype: {
            };

        }

    }

}