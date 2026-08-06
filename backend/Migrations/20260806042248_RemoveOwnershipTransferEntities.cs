using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auto_Wash.Migrations
{
    /// <inheritdoc />
    public partial class RemoveOwnershipTransferEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS ownershiptransferdocuments CASCADE;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS ownershiptransferrequests CASCADE;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS vehicleownershiphistories CASCADE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
